import fs from 'fs';
import path from 'path';
import os from 'os';
import * as tar from 'tar';

export async function checkAndUpdate(installDir: string, registryBase: string, currentVersion: string, setUpgradeStateText?: (text: string) => void): Promise<void> {
  let tempDir: string | null = null;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    
    setUpgradeStateText?.('检查更新...');
    const response = await fetch(`${registryBase}/@one/cli`, {
      signal: controller.signal
    });
    clearTimeout(timeout);
    
    if (!response.ok) {
      setUpgradeStateText?.('检查更新失败');
      return;
    }
    
    const data = await response.json();
    const latestVersion = data['dist-tags']?.latest;
    
    if (!latestVersion || latestVersion === currentVersion) {
      setUpgradeStateText?.('已是最新版本');
      return;
    }
    
    const tarballUrl = data.versions?.[latestVersion]?.dist?.tarball;
    if (!tarballUrl) {
      setUpgradeStateText?.('获取更新包失败');
      return;
    }
    
    setUpgradeStateText?.(`发现新版本 ${latestVersion}，正在下载...`);
    tempDir = path.join(os.tmpdir(), `one-cli-update-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });
    
    const tarballPath = path.join(tempDir, 'package.tgz');
    const tarballController = new AbortController();
    const tarballTimeout = setTimeout(() => tarballController.abort(), 30000);
    
    const tarballResponse = await fetch(tarballUrl, {
      signal: tarballController.signal
    });
    clearTimeout(tarballTimeout);
    
    if (!tarballResponse.ok || !tarballResponse.body) {
      setUpgradeStateText?.('下载更新包失败');
      return;
    }
    
    setUpgradeStateText?.('正在下载更新包...');
    const writeStream = fs.createWriteStream(tarballPath);
    const reader = tarballResponse.body.getReader();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      writeStream.write(value);
    }
    
    writeStream.end();
    await new Promise<void>(resolve => writeStream.on('finish', resolve));
    
    setUpgradeStateText?.('正在解压更新包...');
    await tar.x({
      file: tarballPath,
      cwd: tempDir,
      strip: 1
    });
    
    setUpgradeStateText?.('正在安装更新...');
    const bundleDir = path.join(installDir, 'bundle');
    if (fs.existsSync(bundleDir)) {
      fs.rmSync(bundleDir, { recursive: true, force: true });
    }
    
    const sourceBundleDir = path.join(tempDir, 'bundle');
    if (fs.existsSync(sourceBundleDir)) {
      fs.cpSync(sourceBundleDir, bundleDir, { recursive: true });
    }
    
    const sourcePackageJson = path.join(tempDir, 'package.json');
    const targetPackageJson = path.join(installDir, 'package.json');
    if (fs.existsSync(sourcePackageJson)) {
      fs.cpSync(sourcePackageJson, targetPackageJson);
    }
    
    setUpgradeStateText?.(`已更新到版本 ${latestVersion}`);
    
  } catch (error) {
    setUpgradeStateText?.('更新失败');
  } finally {
    if (tempDir && fs.existsSync(tempDir)) {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch {
      }
    }
  }
}
