#pragma once
namespace BrowserHook
{
	/**
	* ��������ڴ���DEP���⡣��Win7ϵͳ�У����CPU֧��DEP���֣���Ĭ��
	* ����ϵͳ�����£����ؾɰ�Alt�����ActiveX�ᵼ��Firefox������
	*/
	class AtlDepHook
	{
	public:
		static AtlDepHook s_instance;
		void Install(void);
		void Uninstall(void);
	private:
		AtlDepHook(void){};
		~AtlDepHook(void){};
	};
}

