----------------- BEGIN LICENSE BLOCK -------------------------
Fire-IE is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

Fire-IE is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with Fire-IE.  If not, see <http://www.gnu.org/licenses/>.
   Contributor(s):
    Yuan Xulei <hi@yxl.name>
    Wei Deng <wdeng@mozilla.com>
    Yifan Wu <patwonder@163.com>
------------------- END LICENSE BLOCK -------------------------
 
A Firefox add-on that lets you switch to IE engine in one click and give up your Internet Explorer.

Build
==================
Open plugin.sln with Visual Studio 2015 and build the solution.
After successful building, you will get the add-on file of the name fireie32(64).xpi.
To build a unified xpi containing both x86 and x64 binaries, you could either:
  * run tools/buildxpi-unified.bat after both builds are done.
or
  * run tools/compile-and-build-unified.bat directly (requires MSBuild). This will first build the required binaries, and then package them.
