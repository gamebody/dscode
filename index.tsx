#!/usr/bin/env -S node --no-warnings=ExperimentalWarning

import React from 'react';
import { render } from 'ink';
import App from './src/App';
import { themeManager } from './src/themes/theme-manager';
import cliPkgJson from './package.json' with { type: 'json' };
import { AppStoreProvider, Base } from './src/store/index';
import os from 'os'
import path from 'path'
import { setPlatform } from './src/utils/platform';
import fs from 'fs'

themeManager.setActiveTheme('ANSI')

const storageDir = path.join(os.homedir(), './.one-coder')

if (!fs.existsSync(storageDir)) {
  fs.mkdirSync(storageDir, { recursive: true })
}

const base: Base = {
  cwd: process.cwd(),
  productName: 'ONECODER',
  version: cliPkgJson.version,
  storageDir: storageDir,
  todosDir: path.join(storageDir, 'todos'),
  userConfigPath: path.join(storageDir, 'user-config.json'),
  logs: path.join(storageDir, 'logs'),
};

setPlatform('cli')

// 渲染应用
render(
  <AppStoreProvider base={base}>
    <App />
  </AppStoreProvider>,
  {
    exitOnCtrlC: false, // 禁用默认的 Ctrl+C 退出，使用自定义处理
  }
);
