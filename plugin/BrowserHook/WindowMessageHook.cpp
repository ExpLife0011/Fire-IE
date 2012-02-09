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

  // The message loop of Mozilla does not handle accelertor keys.
  // IOleInplaceActivateObject requires MSG be filtered by its TranslateAccellerator() method.
  // So we install a hook to do the dirty hack.
  // Mozilla message loop is here:
  // http://mxr.mozilla.org/mozilla-central/source/widget/src/windows/nsAppShell.cpp
  // bool nsAppShell::ProcessNextNativeEvent(bool mayWait)
  // It does PeekMessage, TranslateMessage, and then pass the result directly
  // to DispatchMessage.
  // Just before PeekMessage returns, our hook procedure is called.
  LRESULT CALLBACK WindowMessageHook::GetMsgProc(int nCode, WPARAM wParam, LPARAM lParam) 
  { 
    if (nCode >= 0 && wParam == PM_REMOVE && lParam)
    {
      MSG * pMsg = reinterpret_cast<MSG *>(lParam);
      HWND hwnd = pMsg->hwnd;

      // ֻ���������Ϣ
      if (pMsg->message < WM_KEYFIRST || pMsg->message > WM_KEYLAST || hwnd == NULL)
      {
        goto Exit;
      }

      // ֻ����IE������Ϣ��ͨ����鴰���������˷�IE����
      CString strClassName;
      GetClassName(hwnd, strClassName.GetBuffer(MAX_PATH), MAX_PATH);
      strClassName.ReleaseBuffer(); 
      if (WM_KEYDOWN == pMsg->message && VK_TAB == pMsg->wParam && strClassName == _T("Internet Explorer_TridentCmboBx"))
      {
        hwnd = ::GetParent(hwnd);
        GetClassName(hwnd, strClassName.GetBuffer(MAX_PATH), MAX_PATH);
        strClassName.ReleaseBuffer(); 
      }
      if (strClassName != _T("Internet Explorer_Server"))
      {
        goto Exit;
      }

      // ��ȡCIEHostWindow����
      CIEHostWindow* pIEHostWindow = CIEHostWindow::FromInternetExplorerServer(hwnd);
      if (pIEHostWindow == NULL) 
      {
        goto Exit;
      }

      if (pMsg->message == WM_KEYDOWN || pMsg->message == WM_SYSKEYDOWN || pMsg->message == WM_SYSKEYUP)
      {
        BOOL bAltPressed = HIBYTE(GetKeyState(VK_MENU)) != 0;
        BOOL bCtrlPressed = HIBYTE(GetKeyState(VK_CONTROL)) != 0;
        BOOL bShiftPressed = HIBYTE(GetKeyState(VK_SHIFT))  != 0;

        // ��Alt���ͷ�ʱ��Ҳ��Firefox����ת����ť��Ϣ�������޷�ͨ��Alt��ѡ�����˵���
        if (pMsg->message == WM_SYSKEYUP && pMsg->wParam == VK_MENU) 
        {
          bAltPressed = TRUE;
        }

        if (bCtrlPressed || bAltPressed || ((pMsg->wParam >= VK_F1) && (pMsg->wParam <= VK_F24)))
        {
          int nKeyCode = static_cast<int>(pMsg->wParam);
          if (FilterFirefoxKey(nKeyCode, bAltPressed, bCtrlPressed, bShiftPressed))
          {
            HWND hwndMessageTarget = GetTopMozillaWindowClassWindow(pIEHostWindow->GetSafeHwnd());
            if (hwndMessageTarget)
            {
              ::SetFocus(hwndMessageTarget);
              ::PostMessage(hwndMessageTarget, pMsg->message, pMsg->wParam, pMsg->lParam );
              pMsg->message = WM_NULL;
              goto Exit;
            }
          }
        }
      }

      if (pIEHostWindow->m_ie.TranslateAccelerator(pMsg) == S_OK)
      {
        pMsg->message = WM_NULL;
      }
    }
Exit:
    return CallNextHookEx(s_hhookGetMessage, nCode, wParam, lParam); 
  }

  BOOL WindowMessageHook::FilterFirefoxKey(int keyCode, BOOL bAltPressed, BOOL bCtrlPressed, BOOL bShiftPressed)
  {
    // BUG FIX: Characters like @, #, � (and others that require AltGr on European keyboard layouts) cannot be entered in the plugin
    // Suggested by Meyer Kuno (Helbling Technik): AltGr is represented in Windows massages as the combination of Alt+Ctrl, and that is used for text input, not for menu naviagation.
    // 
    if (bAltPressed && !bCtrlPressed)
    {
      switch (keyCode)
      {
        // Below is standard firefox menu shortcuts
      case 'F':  // Alt+F, File menu
      case 'E':  // Alt+E, Eidt menu
      case 'V':  // Alt+V, View menu
      case 'S':  // Alt+S, History menu
      case 'B':  // Alt+B, Bookmarks menu
      case 'T':  // Alt+T, Tools menu
      case 'H':  // Alt+H, Help menu
        return TRUE;
      case VK_MENU:   // Only ALT is pressed. Select or show the menu bar.
        return TRUE;
        break;
      default:
        break;
      }
    }
    else if (bCtrlPressed && !bAltPressed)
    {
      if (bShiftPressed)
      {
        switch (keyCode)
        {
        case 'H': // Ctrl+Shift+H, Show all bookmarks
        case 'A': // Ctrl+Shift+A, Show Add-ons
        case 'P': // Ctrl+Shift+P, Start private browsing
        case VK_DELETE: // Ctrl+Shift+Delete, Clear recent history
        case 'K': // Ctrl+Shift+K, Web console 
        case 'J': // Ctrl+Shift+J, Error console
        case 'I': // Ctrl+Shift+I, DOM inspector
          return TRUE;
        }
      }
      else 
      {
        switch (keyCode)
        {
        case 'T': // Ctrl+T, New Tab
        case 'N': // Ctrl+N, New window
        case 'O': // Ctrl+O, Open File
        case 'L': // Ctrl+L, change keyboard focus to address bar
        case '/': // Ctrl+/, Toggle add-on bar
        case 'B': // Ctrl+B, Toggle bookmarks sidebar
        case 'H': // Ctrl+H, Toggle history sidebar
        case '+': // Ctrl++, Zoom in      // BUG ��ʱ����Ӧ
        case '-': // Ctrl+-, Zoom out     // BUG ��ʱ����Ӧ
        case '0': // Ctrl+0, Reset zoom
        case 'D': // Ctrl+D, Bookmark this page
        case 'J': // Ctrl+J, Show downloads
        case 'U': // Ctrl+U, Page source
          return TRUE;
        default:
          break;
        }
      }
    }
    else if (bCtrlPressed && bAltPressed)
    {
      switch (keyCode)
      {
      case 'R': // Ctrl+Alt+R, Restart
        return TRUE;
      default:
        break;
      }
    }
    else if (bShiftPressed)
    {
      switch (keyCode)
      {
      case VK_F4: // Shift+F4, Scratchpad
      case VK_F7: // Shift+F7, Style Editor
        return TRUE;
      default:
        break;
      }
    }
    else 
    {
      switch (keyCode)
      {
      case VK_F11: // F11, Full screen
      case VK_F12: // F12, Firebug
        return TRUE;
      default:
        break;
      }
    }
    return FALSE;
  }

	LRESULT CALLBACK WindowMessageHook::CallWndRetProc(int nCode, WPARAM wParam, LPARAM lParam)
  {
    if (nCode == HC_ACTION)
    {
      CWPRETSTRUCT * info = (CWPRETSTRUCT*) lParam;
      // info->wParam == NULL ��ʾ�����Ƶ���������ȥ�ˣ�����ֻ�������ʱ���Ҫ����IE�Ľ���
      if (WM_KILLFOCUS == info->message && NULL == info->wParam)
      {
        HWND hwnd = info->hwnd;
        CString strClassName;
        GetClassName(hwnd, strClassName.GetBuffer(MAX_PATH), MAX_PATH);
        strClassName.ReleaseBuffer(); 
        if (strClassName ==  _T("Internet Explorer_Server"))
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

		return CallNextHookEx(s_hhookCallWndProcRet, nCode, wParam, lParam);
	}
}
