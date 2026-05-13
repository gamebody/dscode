import { MarkdownDisplayProps } from "../utils/MarkdownDisplay"
import { CommandTagProps } from "./CommandTag"
import { FileItemProps } from "./FileItem"
import { UserTextProps } from "./UserText"
import { SimpleTextProps } from "./SimpleText"
import { GitlabSelectProps } from "./GitlabSelect"




export type DisplayItem =
  { type: 'FileItem' } & FileItemProps |
  { type: 'CommandTag' } & CommandTagProps |
  { type: 'MarkdownDisplay' } & MarkdownDisplayProps |
  { type: 'UserText' } & UserTextProps |
  { type: 'SimpleText' } & SimpleTextProps |
  { type: 'GitlabSelect' } & GitlabSelectProps |
  { type: 'StatusText', text: string } |
  { type: 'Usage', text: number } |
  { type: 'ContextLeft', text: number } |
  { type: 'Speed', text: number } |
  { type: 'TotalChars', text: number }


