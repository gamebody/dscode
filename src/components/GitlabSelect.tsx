

import React, { useEffect, useRef, useState } from "react";
import { Box, Newline, Text, useInput } from "ink";
import { RadioButtonSelect } from "./RadioButtonSelect";
import { GitLab } from "@one/core";
import { Branch, Diff, Project } from "@one/core/dist/src/gitlab";
import TextInput from "ink-text-input";
import { Colors } from "../utils/colors";

export type GitlabSelectProps = {
  onSubmit: (text: string) => void
  onCancel: () => void
};

export const name = 'GitlabSelect' as const

const GitlabSelect: React.FC<GitlabSelectProps> = ({ onSubmit, onCancel }) => {

  const [projects, setProjects] = React.useState<Project[]>([])
  const [project, setProject] = React.useState<string>('')

  const [branches, setBranches] = React.useState<Branch[]>([])
  const [branchName, setBranchName] = React.useState<string>('')
  const [compareBranchName, setCompareBranchName] = React.useState<string>('')

  const [diffs, setDiffs] = useState<Diff[]>([])

  const [search, setSerch] = useState('')

  const [email, setEmail] = useState('')

  const [loading, setLoading] = useState(true)

  const projectRef = useRef<GitLab>(null)

  const selectedProject = projects.find(p => p.id === project)


  useInput((input, key) => {

    if (key.escape) {
      if (!selectedProject) {
        onCancel()
        return
      } else if (selectedProject && !branchName) {
        setBranchName('')
        setProject('')
      } else if (selectedProject && branchName && !compareBranchName) {
        setBranchName('')
      } else if (selectedProject && branchName && compareBranchName) {
        setCompareBranchName('')
        setDiffs([])
      }
    }

    if (key.return) {
      if (diffs.length != 0) {
        onSubmit(`${project},${branchName},${compareBranchName},${selectedProject?.path_with_namespace},${selectedProject?.description},${email}`)
      }
    }
  });


  useEffect(() => {
    setLoading(true)
    GitLab.getProjects().then(res => {
      setLoading(false)
      setProjects(res)
    })
  }, [])



  return (
    <>
    <Text>
      ← <Text color={Colors.AccentGreen}>Esc</Text> 返回
    </Text>
    <Box flexDirection={'column'} borderStyle={'round'} borderColor={Colors.AccentBlue} paddingX={1}>
      {
        !selectedProject && (
          <>
          <RadioButtonSelect
            loading={loading}
            placeholder="输入过滤 / ↑↓ 选择 Gitlab 项目"
            filterable
            showScrollArrows
            maxItemsToShow={7}
            onSelect={(project) => {
              setProject(project)
              projectRef.current = new GitLab(+project)
              projectRef.current.branches('').then(res => {
                setBranches(res)
              })
            }}
            items={projects.map(project => ({
              label: `${project.name}（${project.description}）`,
              value: project.id
            }))} />
          </>
        )
          
      }
      {
        (selectedProject && !branchName) && (
          <>
          <TextInput
            placeholder="输入查询 / ↑ ↓ 选择功能分支"
            value={search}
            onChange={(value) => {
              projectRef.current?.branches(value).then(res => {
                setBranches(res)
              })
              setSerch(value)
            }} />
          <RadioButtonSelect
            showScrollArrows
            maxItemsToShow={7}
            onSelect={(branchName) => {
              setBranchName(branchName)
            }}
            items={branches.map(branch => ({
              label: `${branch.name}  => ${branch.commit.author_name}`,
              value: branch.name
            }))} />
          </>
        )
      }
      {
        branchName && diffs.length == 0 && (
          <>
            <Text color={Colors.Gray}>请输入源分支</Text>
            <TextInput
              placeholder="master"
              value={compareBranchName}
              onChange={(value) => {
                setCompareBranchName(value)
              }}
              onSubmit={async (value) => {
                value = !!value ? value : 'master'

                setCompareBranchName(value)

                const res = await projectRef.current?.compare(value, branchName)

                if (res?.commit?.author_email) {
                  setEmail(res?.commit?.author_email)
                }

                setDiffs(res?.diffs ?? [])

              }}
            />
          </>
        )
      }
      {
        diffs.length != 0 && (
          <Box flexDirection='column'>
            <Text color={Colors.Comment}>{`git compare ${branchName} to ${compareBranchName}`}</Text>
            <Box height={1} />

            {
              diffs.map(diff => {
                let status = diff.new_file ? '+' : 'M'
                status = diff.deleted_file ? '-' : 'M'


                return (
                  <Text key={diff.new_path}>
                    {
                    `${status} ${diff.new_path} [changed: ${diff.diff.length}]`
                    }
                  </Text>
                )
              })
            }
            <Box height={1} />
            <Box>
              <Text>
                <Text color={Colors.AccentGreen}>Enter</Text> <Text>确认</Text>
              </Text>
            </Box>
          </Box>
        )
      }
    </Box>
    </>
  );
};

export default React.memo(GitlabSelect)









