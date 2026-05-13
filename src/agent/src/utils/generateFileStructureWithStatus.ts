
type AnalyzeStatus = 'Analyzed' | 'Analyzing' | 'NotAnalyzed'

export type FileItem = {
  status: AnalyzeStatus
  path: string
  understanding?: string
}


export default function generateFileStructureWithStatus(files: FileItem[]) {

  return `Files:
${files.map(file => {
  return `${file.status} ${file.path}`
}).join('\n')}
  `
}