---
name: 'code-review'
description: 'REDIRECTS to /ecc-code-review — Use the ECC version for 4-agent parallel code review'
disable-model-invocation: true
---

**This command redirects to the ECC workflow.**

Use `/ecc-code-review` instead for the full ECC 4-agent parallel code review.

<steps CRITICAL="TRUE">
1. Always LOAD the FULL @{project-root}/_bmad/core/tasks/workflow.xml
2. READ its entire contents - this is the CORE OS for EXECUTING the specific workflow-config @{project-root}/_ecc/workflows/ecc-code-review/workflow.yaml
3. Pass the yaml path @{project-root}/_ecc/workflows/ecc-code-review/workflow.yaml as 'workflow-config' parameter to the workflow.xml instructions
4. Follow workflow.xml instructions EXACTLY as written to process and follow the specific workflow config and its instructions
5. Save outputs after EACH section when generating any documents from templates
</steps>
