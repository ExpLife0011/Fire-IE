#include "StdAfx.h"
#include "WindowMessageHook.h"
#include "PluginApp.h"
#include "IEHostWindow.h"

namespace BrowserHook
{
	// Initialize static variables
	HHOOK WindowMessageHook::s_hhookGetMessage = NULL;
	HHOOK WindowMessageHook::s_hhookCallWndProcRet = NULL;
	WindowMessageHook WindowMessageHook::s_instance;

	WindowMessageHook::WindowMessageHook(void)
	{
	}


	WindowMessageHook::~WindowMessageHook(void)
	{
	}

	BOOL BrowserHook::WindowMessageHook::Install(void)
	{
		if (NULL == s_hhookGetMessage)
		{
			s_hhookGetMessage = SetWindowsHookEx( WH_GETMESSAGE, GetMsgProc, NULL, GetCurrentThreadId() );
		}

		if (NULL == s_hhookCallWndProcRet)
		{
			s_hhookCallWndProcRet = SetWindowsHookEx( WH_CALLWNDPROCRET, CallWndRetProc, NULL, GetCurrentThreadId() );
		}
		return TRUE;
	}

	BOOL BrowserHook::WindowMessageHook::Uninstall(void)
	{
		if (s_hhookGetMessage)
		{
			UnhookWindowsHookEx(s_hhookGetMessage);
			s_hhookGetMessage = NULL;
		}

		if (s_hhookCallWndProcRet)
		{
			UnhookWindowsHookEx(s_hhookCallWndProcRet);
			s_hhookCallWndProcRet= NULL;
		}
		return TRUE;
	}

	inline VOID PreTranslateAccelerator(HWND hwnd, MSG * pMsg)
	{
		static const UINT  WM_HTML_GETOBJECT = ::RegisterWindowMessage(_T( "WM_HTML_GETOBJECT" ));

		LRESULT lRes;
		if ( ::SendMessageTimeout( hwnd, WM_HTML_GETOBJECT, 0, 0, SMTO_ABORTIFHUNG, 1000, (DWORD*)&lRes ) && lRes )
		{
			CComPtr<IHTMLDocument2> spDoc;
			if (SUCCEEDED(::ObjectFromLresult(lRes, IID_IHTMLDocument2, 0, (void**)&spDoc)))
			{
				CComQIPtr<IServiceProvider> spSP(spDoc);
				if (spSP)
				{
					CComPtr<IWebBrowser2> spWB2;
					if ( SUCCEEDED(spSP->QueryService(IID_IWebBrowserApp, IID_IWebBrowser2, (void**)&spWB2)) && spWB2 )
					{
						CComPtr< IDispatch > pDisp;
						if ( SUCCEEDED(spWB2->get_Application(&pDisp)) && pDisp )
						{
							CComQIPtr< IOleInPlaceActiveObject > spObj( pDisp );
							if ( spObj )
							{
								if (spObj->TranslateAccelerator(pMsg) == S_OK)
								{
									pMsg->message = /*uMsg = */WM_NULL;
								}
							}
						}
					}
				}
			}
		}
	}

	LRESULT CALLBACK WindowMessageHook::GetMsgProc(int nCode, WPARAM wParam, LPARAM lParam) 
	{ 
		if ( (nCode >= 0) && (wParam == PM_REMOVE) && lParam)
		{
			MSG * pMsg = (MSG *)lParam;

			UINT uMsg = pMsg->message;
			if ((uMsg >= WM_KEYFIRST) && (uMsg <= WM_KEYLAST))
			{
				HWND hwnd = pMsg->hwnd;
				TCHAR szClassName[MAX_PATH];
				if ( GetClassName( hwnd, szClassName, ARRAYSIZE(szClassName) ) > 0 )
				{
					//TRACE(_T("%s: Msg = %.4X, wParam = %.8X, lParam = %.8X\r\n"), szClassName, uMsg, pMsg->wParam, pMsg->lParam );

					if ( ( WM_KEYDOWN == uMsg ) && ( VK_TAB == pMsg->wParam ) && (_tcscmp(szClassName, _T("Internet Explorer_TridentCmboBx")) == 0) )
					{
						hwnd = ::GetParent(pMsg->hwnd);
					}
					if (_tcscmp(szClassName, _T("Internet Explorer_Server")) != 0)
					{
						hwnd = NULL;
					}

					if (hwnd)
					{
						PreTranslateAccelerator(hwnd, pMsg);

						if (uMsg == WM_KEYDOWN || uMsg == WM_SYSKEYDOWN || uMsg == WM_SYSKEYUP)
						{
							// BUG FIX: Characters like @, #, � (and others that require AltGr on European keyboard layouts) cannot be entered in the plugin
							// Suggested by Meyer Kuno (Helbling Technik): AltGr is represented in Windows massages as the combination of Alt+Ctrl, and that is used for text input, not for menu naviagation.
							// 
							bool bCtrlPressed = HIBYTE(GetKeyState(VK_CONTROL))!=0;
							bool bAltPressed = HIBYTE(GetKeyState(VK_MENU))!=0;

							// ��Alt���ͷ�ʱ��Ҳ��Firefox����ת����ť��Ϣ�������޷�ͨ��Alt��ѡ�����˵���
							if (uMsg == WM_SYSKEYUP && pMsg->wParam == VK_MENU) 
							{
								bAltPressed = TRUE;
							}
							if ( ( bCtrlPressed ^ bAltPressed) || ((pMsg->wParam >= VK_F1) && (pMsg->wParam <= VK_F24)) )
							{
								/* Test Cases by Meyer Kuno (Helbling Technik):
								Ctrl-L (change keyboard focus to navigation bar)
								Ctrl-O (open a file)
								Ctrl-P (print)
								Alt-d (sometimes Alt-s): "Address": the IE-way of Ctrl-L
								Alt-F (open File menu) (NOTE: BUG: keyboard focus is not moved)
								*/
								CIEHostWindow* pIEHostWindow = CIEHostWindow::FromInternetExplorerServer(hwnd);
								if (pIEHostWindow)
								{
									HWND hwndMessageTarget = GetTopMozillaWindowClassWindow(pIEHostWindow->GetSafeHwnd());

									if ( hwndMessageTarget )
									{
										if ( bAltPressed )
										{
											// BUG FIX: Alt-F (open File menu): keyboard focus is not moved
											switch ( pMsg->wParam )
											{
											case 'F':
											case 'E':
											case 'V':
											case 'S':
											case 'B':
											case 'T':
											case 'H':
												::SetFocus(hwndMessageTarget);
												TRACE(_T("%x, Alt + %c pressed!\n"),  hwndMessageTarget, pMsg->wParam);
												break;
												// ���¿�ݼ��� IE �ڲ�����, ������� Firefox �Ļ��ᵼ���ظ�
											case VK_LEFT:	// ǰ��
											case VK_RIGHT:	// ����
												uMsg = WM_NULL;
												break;
											case VK_MENU:
												::SetFocus(hwndMessageTarget);
												break;
											default:
												break;
											}
										}
										else if ( bCtrlPressed )
										{
											switch ( pMsg->wParam )
											{
												// ���¿�ݼ��� IE �ڲ�����, ������� Firefox �Ļ��ᵼ���ظ�
											case 'P':
											case 'F':
												uMsg = WM_NULL;
												break;
											default:
												break;
											}
										}

										if ( uMsg != WM_NULL )
										{
											// ����ͬһ�����̵Ļ����� SendMessage() �����
											::PostMessage( hwndMessageTarget, uMsg, pMsg->wParam, pMsg->lParam );
										}
									}
								}
							}
						}
					}
				}
			}
		}

		return CallNextHookEx(s_hhookGetMessage, nCode, wParam, lParam); 
	} 

	LRESULT CALLBACK WindowMessageHook::CallWndRetProc(int nCode, WPARAM wParam, LPARAM lParam)
	{
		if (nCode == HC_ACTION)
		{
			CWPRETSTRUCT * info = (CWPRETSTRUCT*) lParam;
			UINT uMsg = info->message;
			// info->wParam == NULL ��ʾ�����Ƶ���������ȥ�ˣ�����ֻ�������ʱ���Ҫ����IE�Ľ���
			if ( ( WM_KILLFOCUS == uMsg ) && ( NULL == info->wParam ) )
			{
				HWND hwnd = info->hwnd;
				TCHAR szClassName[MAX_PATH];
				if ( GetClassName( hwnd, szClassName, ARRAYSIZE(szClassName) ) > 0 )
				{
					if ( _tcscmp(szClassName, _T("Internet Explorer_Server")) == 0 )
					{
						// ���°ѽ����Ƶ� plugin �����ϣ������ӱ�Ľ��̴����л�������ʱ��IE�����н���
						CIEHostWindow* pIEHostWindow = CIEHostWindow::FromInternetExplorerServer(hwnd);
						if (pIEHostWindow)
						{
							pIEHostWindow->SetFocus();
						}
					}
				}
			}
		}

		return CallNextHookEx(s_hhookCallWndProcRet, nCode, wParam, lParam);
	}
}
