/* ***** BEGIN LICENSE BLOCK *****
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 * ***** END LICENSE BLOCK ***** */
// PluginApp.h : main header file for the plugin DLL
//

#pragma once

#ifndef __AFXWIN_H__
	#error "include 'stdafx.h' before including this file for PCH"
#endif

#include "resource.h"		// main symbols

#define STR_WINDOW_CLASS_NAME	_T("FireIE")	// CIEHostWindow��������

/** ��CStringת��ΪUTF8�ַ�����
 *  ʹ����Ϻ������delete[]�ͷ��ַ���
 */
char* CStringToUTF8String(const CString &str);

/** ��UTF8�ַ���תΪCString*/
CString UTF8ToCString(const char* szUTF8);

// CPluginApp
// See PluginApp.cpp for the implementation of this class
//

/**
* ģ��ƥ������ URL.
* http://my.com/path/file.html#123 �� http://my.com/path/file.html ����Ϊ��ͬһ�� URL
* http://my.com/path/query?p=xyz �� http://my.com/path/query ����Ϊ��ͬһ�� URL
*/
BOOL FuzzyUrlCompare (LPCTSTR lpszUrl1, LPCTSTR lpszUrl2);

class CPluginApp : public CWinApp
{
public:
	CPluginApp();

// Overrides
public:
	virtual BOOL InitInstance();

	DECLARE_MESSAGE_MAP()
  virtual int ExitInstance();
};
