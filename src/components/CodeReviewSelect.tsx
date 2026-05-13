import React, { FC, useEffect, useRef, useState } from 'react';
import { GitLab } from "@one/core";
import { Box, Text } from "ink";
import SelectInput from 'ink-select-input'
import { Branch, Project } from "@one/core/dist/src/gitlab";
import TextInput from 'ink-text-input';



type Props = {
  onSubmit: (payload: {
    project: Project
    branch: string
    originalBranch: string
  }) => void
}

const CodeReviewSelect: FC<Props> = ({ onSubmit }) => {
  const [project, setProject] = useState<Project>()
  const [projects, setProjects] = useState<Project[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [search, setSearch] = useState('')


  const fetchBranches = async (projectId: number, search?: string) => {
    const gitlab = new GitLab(projectId)

    const branches = await gitlab.branches(search||'')
    setBranches(branches)
  }

  useEffect(() => {
    GitLab.getProjects().then(projects => {
      setProjects(projects)
    })

    if (project) {
      fetchBranches(+project.id, '')
    }
  }, [project])

  return (
    <Box marginLeft={2} paddingX={1} flexDirection='column'>
      {
        !project && (
          <>
          <Text>请选择gitlab Repo</Text>
          <SelectInput
            items={projects.map(project => ({
              label: project.path_with_namespace + '(' + project.description + ')',
              value: project.id
            }))}
            onSelect={item => {
              setProject(projects.find(project => project.id === item.value))
            }} />
          </>
        )
      }

      {
        project && (
          <>
          <Text>Branch</Text>
          <Box borderStyle="round" borderColor='blue' paddingX={1}>
            <TextInput
              value={search}
              onChange={(value) => {
                setSearch(value)
                fetchBranches(+project.id, value)
              }} />
          </Box>
          <SelectInput
            items={branches.map(branch => ({
              label: branch.name,
              value: branch.name
            }))}
            onSelect={item => {
              setProject(undefined)
              onSubmit({
                project,
                branch: item.value,
                originalBranch: 'master'
              })
            }} />
          </>
        )
      }

    </Box>
  );
}

export default CodeReviewSelect
