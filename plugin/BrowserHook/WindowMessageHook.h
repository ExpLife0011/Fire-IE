#pragma once

namespace BrowserHook
{
	class WindowMessageHook
	{
	public:
		static WindowMessageHook s_instance;
		~WindowMessageHook(void);
		BOOL Install(void);
		BOOL Uninstall(void);

	private:
		WindowMessageHook(void);
		static LRESULT CALLBACK GetMsgProc(int code, WPARAM wParam, LPARAM lParam);
		static LRESULT CALLBACK CallWndRetProc(int nCode, WPARAM wParam, LPARAM lParam);
	private:
		// WH_GETMESSAGE, ����ת��IE�ؼ���Firefox���ڼ�ļ�����Ϣ
		static HHOOK s_hhookGetMessage;
		// WH_CALLWNDPROCRET, �������� WM_KILLFOCUS ��Ϣ
		static HHOOK s_hhookCallWndProcRet;
	};
}

