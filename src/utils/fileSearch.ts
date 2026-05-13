import fs from 'fs';
import path from 'path';

export interface FileSearchResult {
  name: string;
  path: string;
  isDirectory: boolean;
  relativePath: string;
}

/**
 * 模糊搜索文件和目录
 * @param searchTerm 搜索词
 * @param cwd 当前工作目录
 * @param maxResults 最大结果数
 * @returns 匹配的文件和目录列表
 */
export async function fuzzySearchFiles(
  searchTerm: string,
  cwd: string,
  maxResults: number = 999
): Promise<FileSearchResult[]> {
  const results: FileSearchResult[] = [];
  
  // 如果搜索词为空，返回全部文件
  if (!searchTerm.trim()) {
    return getAllFiles(cwd, maxResults);
  }

  // 将搜索词转换为小写用于不区分大小写的匹配
  const searchLower = searchTerm.toLowerCase();
  
  // 递归搜索目录
  async function searchDirectory(dirPath: string, depth: number = 0): Promise<void> {
    if (depth > 5) return; // 限制递归深度
    
    try {
      const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const entryPath = path.join(dirPath, entry.name);
        const relativePath = path.relative(cwd, entryPath);
        
        // 检查是否匹配搜索词
        const nameLower = entry.name.toLowerCase();
        const relativePathLower = relativePath.toLowerCase();
        
        // 匹配文件名或相对路径
        if (nameLower.includes(searchLower) || relativePathLower.includes(searchLower)) {
          results.push({
            name: entry.name,
            path: entryPath,
            isDirectory: entry.isDirectory(),
            relativePath: relativePath
          });
          
          if (results.length >= maxResults) {
            return;
          }
        }
        
        // 如果是目录，递归搜索（跳过node_modules目录）
        if (entry.isDirectory() && results.length < maxResults) {
          // 跳过node_modules目录
          if (entry.name !== 'node_modules') {
            await searchDirectory(entryPath, depth + 1);
          }
        }
        
        if (results.length >= maxResults) {
          return;
        }
      }
    } catch (error) {
      // 忽略权限错误等
      console.error(`Error reading directory ${dirPath}:`, error);
    }
  }
  
  await searchDirectory(cwd);
  
  // 按匹配度排序：完全匹配 > 前缀匹配 > 其他匹配
  return results.sort((a, b) => {
    const aName = a.name.toLowerCase();
    const bName = b.name.toLowerCase();
    const aPath = a.relativePath.toLowerCase();
    const bPath = b.relativePath.toLowerCase();
    
    // 完全匹配优先（文件名）
    if (aName === searchLower && bName !== searchLower) return -1;
    if (bName === searchLower && aName !== searchLower) return 1;
    
    // 完全匹配优先（路径）
    if (aPath === searchLower && bPath !== searchLower) return -1;
    if (bPath === searchLower && aPath !== searchLower) return 1;
    
    // 前缀匹配次之（文件名）
    const aNameStartsWith = aName.startsWith(searchLower);
    const bNameStartsWith = bName.startsWith(searchLower);
    if (aNameStartsWith && !bNameStartsWith) return -1;
    if (bNameStartsWith && !aNameStartsWith) return 1;
    
    // 前缀匹配次之（路径）
    const aPathStartsWith = aPath.startsWith(searchLower);
    const bPathStartsWith = bPath.startsWith(searchLower);
    if (aPathStartsWith && !bPathStartsWith) return -1;
    if (bPathStartsWith && !aPathStartsWith) return 1;
    
    // 目录优先
    if (a.isDirectory && !b.isDirectory) return -1;
    if (b.isDirectory && !a.isDirectory) return 1;
    
    // 按路径长度排序（较短的路径优先）
    return a.relativePath.length - b.relativePath.length;
  }).slice(0, maxResults);
}

/**
 * 提取@符号后的搜索词
 * @param text 输入文本
 * @returns 搜索词或null（如果没有@符号）
 */
export function extractFileSearchTerm(text: string): string | null {
  // 查找最后一个@符号
  const lastAtIndex = text.lastIndexOf('@');
  if (lastAtIndex === -1) return null;
  
  // 获取@符号后的内容
  const afterAt = text.slice(lastAtIndex + 1);
  
  // 如果@符号后是空格或为空，返回null
  if (!afterAt.trim()) return null;
  
  // 返回搜索词（去除可能的空格）
  return afterAt.trim();
}

/**
 * 替换@搜索词为完整路径
 * @param text 原始文本
 * @param searchTerm 搜索词
 * @param replacement 替换的完整路径
 * @returns 替换后的文本
 */
export function replaceFileSearchTerm(text: string, searchTerm: string, replacement: string): string {
  // 查找最后一个@符号
  const lastAtIndex = text.lastIndexOf('@');
  if (lastAtIndex === -1) return text;
  
  // 获取@符号后的部分
  const afterAt = text.slice(lastAtIndex + 1);
  
  // 如果afterAt以searchTerm开头，替换它
  if (afterAt.startsWith(searchTerm)) {
    const beforeAt = text.slice(0, lastAtIndex + 1);
    const afterSearchTerm = afterAt.slice(searchTerm.length);
    return beforeAt + replacement + afterSearchTerm;
  }
  
  return text;
}

/**
 * 获取全部文件并按合理顺序排序
 * @param cwd 当前工作目录
 * @param maxResults 最大结果数
 * @returns 排序后的文件和目录列表
 */
async function getAllFiles(
  cwd: string,
  maxResults: number = 999
): Promise<FileSearchResult[]> {
  const results: FileSearchResult[] = [];
  
  async function collectFiles(dirPath: string, depth: number = 0): Promise<void> {
    if (depth > 3) return; // 限制递归深度，避免性能问题
    
    try {
      const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const entryPath = path.join(dirPath, entry.name);
        const relativePath = path.relative(cwd, entryPath);
        
        results.push({
          name: entry.name,
          path: entryPath,
          isDirectory: entry.isDirectory(),
          relativePath: relativePath
        });
        
        if (results.length >= maxResults * 2) {
          return; // 收集足够多的文件用于排序
        }
        
        // 如果是目录，递归收集（跳过node_modules目录）
        if (entry.isDirectory() && results.length < maxResults * 2) {
          // 跳过node_modules目录
          if (entry.name !== 'node_modules') {
            await collectFiles(entryPath, depth + 1);
          }
        }
        
        if (results.length >= maxResults * 2) {
          return;
        }
      }
    } catch (error) {
      console.error(`Error reading directory ${dirPath}:`, error);
    }
  }
  
  await collectFiles(cwd);
  
  // 按合理顺序排序：
  // 1. 目录优先于文件
  // 2. 按字母顺序排序
  // 3. 隐藏文件（以.开头）排在后面
  // 4. 路径较短的优先
  return results.sort((a, b) => {
    // 目录优先
    if (a.isDirectory && !b.isDirectory) return -1;
    if (b.isDirectory && !a.isDirectory) return 1;
    
    // 隐藏文件排在后面
    const aIsHidden = a.name.startsWith('.');
    const bIsHidden = b.name.startsWith('.');
    if (!aIsHidden && bIsHidden) return -1;
    if (aIsHidden && !bIsHidden) return 1;
    
    // 按字母顺序排序（不区分大小写）
    const nameCompare = a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    if (nameCompare !== 0) return nameCompare;
    
    // 按路径长度排序（较短的路径优先）
    return a.relativePath.length - b.relativePath.length;
  }).slice(0, maxResults);
}
