#include "StdAfx.h"
#include <Wininet.h>
#include <string>
#pragma comment(lib, "Wininet.lib")

#include "plugin.h"
#include "IEHostWindow.h"
#include "MonitorSink.h"
#include "PluginApp.h"
#include "ScriptablePluginObject.h"

namespace HttpMonitor
{
	// ���� \0 �ָ��� Raw HTTP Header ����ת������ \r\n �ָ��� Header
	void HttpRawHeader2CrLfHeader(LPCSTR szRawHeader, CString & strCrLfHeader)
	{
		strCrLfHeader.Empty();

		LPCSTR p = szRawHeader;
		while ( p[0] )
		{
			CString strHeaderLine(p);

			p += strHeaderLine.GetLength() + 1;

			strCrLfHeader += strHeaderLine + _T("\r\n");
		}
	}

	LPWSTR ExtractFieldValue(LPCWSTR szHeader, LPCWSTR szFieldName, LPWSTR * pFieldValue, size_t * pSize )
	{
		LPWSTR r = NULL;

		do 
		{
			// ���� RFC2616 �涨, HTTP field name �����ִ�Сд
			LPWSTR pStart = StrStrIW( szHeader, szFieldName );
			if ( ! pStart ) break;
			pStart += wcslen(szFieldName);
			while ( L' ' == pStart[0] ) pStart++;		// ������ͷ�Ŀո�
			LPWSTR pEnd = StrStrW( pStart, L"\r\n" );
			if ( ( ! pEnd ) || ( pEnd <= pStart ) ) break;

			size_t nSize = pEnd - pStart;
			size_t nBufLen = nSize + 2;		// �����ַ����� 0 ������
			LPWSTR lpBuffer = (LPWSTR)VirtualAlloc( NULL, nBufLen * sizeof(WCHAR), MEM_COMMIT, PAGE_READWRITE );
			if ( !lpBuffer ) break;

			if (wcsncpy_s( lpBuffer, nBufLen, pStart, nSize))
			{
				VirtualFree( lpBuffer, 0, MEM_RELEASE);
				break;
			}

			* pSize = nBufLen;
			* pFieldValue = lpBuffer;
			r = pEnd;

		} while(false);

		return r;
	}

	MonitorSink::MonitorSink()
	{
	}

	STDMETHODIMP MonitorSink::BeginningTransaction(
		LPCWSTR szURL,
		LPCWSTR szHeaders,
		DWORD dwReserved,
		LPWSTR *pszAdditionalHeaders)
	{
		CComPtr<IHttpNegotiate> spHttpNegotiate;
		QueryServiceFromClient(&spHttpNegotiate);
		HRESULT hr = spHttpNegotiate ?
			spHttpNegotiate->BeginningTransaction(szURL, szHeaders,
			dwReserved, pszAdditionalHeaders) : E_UNEXPECTED;

		return hr;
	}

	STDMETHODIMP MonitorSink::OnResponse(
		DWORD dwResponseCode,
		LPCWSTR szResponseHeaders,
		LPCWSTR szRequestHeaders,
		LPWSTR *pszAdditionalRequestHeaders)
	{
		CComPtr<IHttpNegotiate> spHttpNegotiate;
		QueryServiceFromClient(&spHttpNegotiate);
		
		HRESULT hr = spHttpNegotiate ?
			spHttpNegotiate->OnResponse(dwResponseCode, szResponseHeaders,
			szRequestHeaders, pszAdditionalRequestHeaders) :
		E_UNEXPECTED;

		if ((dwResponseCode >= 200 ) && (dwResponseCode < 300))
		{
			ExportCookies(szResponseHeaders);
		}

		return hr;
	}

	CString MonitorSink::GetBindURL() const
	{
		USES_CONVERSION_EX;

		CString strURL;
		WCHAR* pURL = NULL;
		ULONG cEl = 1;

		if (SUCCEEDED(m_spInternetBindInfo->GetBindString(BINDSTRING_URL,	&pURL, cEl, &cEl)))
		{
			strURL = (LPCTSTR)CW2T(pURL);	
		}

		if (pURL)
		{
			CoTaskMemFree(pURL);
		}

		return strURL;
	}

	void MonitorSink::ExportCookies(LPCWSTR szResponseHeaders)
	{
		static const WCHAR SET_COOKIE_HEAD [] = L"\r\nSet-Cookie:";

		LPWSTR p = (LPWSTR)szResponseHeaders;
		LPWSTR lpCookies = NULL;
		size_t nCookieLen = 0;
		while (p = ExtractFieldValue(p, SET_COOKIE_HEAD, &lpCookies, & nCookieLen))
		{
			if (lpCookies)
			{
				CString strURL = GetBindURL();
				CString strCookie((LPCTSTR)CW2T(lpCookies));
				TRACE(_T("[ExportCookies] URL: %s  Cookie: %s\n"), strURL, strCookie);
				CIEHostWindow::SetFirefoxCookie(strURL, strCookie);
				VirtualFree(lpCookies, 0, MEM_RELEASE);
				lpCookies = NULL;
				nCookieLen = 0;
			}

		}
	}

	STDMETHODIMP MonitorSink::ReportProgress(
		ULONG ulStatusCode,
		LPCWSTR szStatusText)
	{
		HRESULT hr = m_spInternetProtocolSink ?
			m_spInternetProtocolSink->ReportProgress(ulStatusCode, szStatusText) :
		E_UNEXPECTED;
		switch ( ulStatusCode )
		{
			 
		// �ض�����, ���¼�¼�� URL
		case BINDSTATUS_REDIRECTING:
			{
				// �ܶ���վ��¼��ʱ�����302��תʱ����Cookie, ����Gmail, ��������������ҲҪ���� Cookie
				CComPtr<IWinInetHttpInfo> spWinInetHttpInfo;
				if (SUCCEEDED(m_spTargetProtocol->QueryInterface(&spWinInetHttpInfo)) && spWinInetHttpInfo )
				{
					CHAR szRawHeader[8192];		// IWinInetHttpInfo::QueryInfo() ���ص� Raw Header ���� Unicode ��
					DWORD dwBuffSize = ARRAYSIZE(szRawHeader);
									
					if (SUCCEEDED(spWinInetHttpInfo->QueryInfo(HTTP_QUERY_RAW_HEADERS, szRawHeader, &dwBuffSize, 0, NULL)))
					{
						// ע�� HTTP_QUERY_RAW_HEADERS ���ص� Raw Header �� \0 �ָ���, �� \0\0 ��Ϊ����, ��������Ҫ��ת��
						CString strHeader;
						HttpRawHeader2CrLfHeader(szRawHeader, strHeader);

						ExportCookies(strHeader);
					}
				}
			}
			break;
		}
		return hr;
	}

	STDMETHODIMP MonitorSink::ReportResult( 
		HRESULT hrResult,
		DWORD dwError,
		LPCWSTR szResult)
	{
		HRESULT hr = m_spInternetProtocolSink ?
				m_spInternetProtocolSink->ReportResult(hrResult, dwError, szResult):
				E_UNEXPECTED;
		return hr;
	}

	STDMETHODIMP MonitorSink::ReportData( 
		DWORD grfBSCF,
		ULONG ulProgress,
		ULONG ulProgressMax)
	{
		HRESULT hr = m_spInternetProtocolSink ?
				m_spInternetProtocolSink->ReportData(grfBSCF, ulProgress, ulProgressMax):
				E_UNEXPECTED;
		return hr;
	}

	STDMETHODIMP MonitorSink::Switch(PROTOCOLDATA *pProtocolData)
	{
		HRESULT hr = m_spInternetProtocolSink ?
			m_spInternetProtocolSink->Switch(pProtocolData) :
			E_UNEXPECTED;
		return hr;
	}
}