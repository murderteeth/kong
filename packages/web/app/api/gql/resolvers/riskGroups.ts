import db from '../../db'

export default async () => {
  const query = `
    SELECT 
      chain_id as "chainId", 
      name,
      audit_score as "auditScore",
      code_review_score as "codeReviewScore",
      complexity_score as "complexityScore",
      protocol_safety_score as "protocolSafetyScore",
      team_knowledge_score as "teamKnowledgeScore",
      testing_score as "testingScore"
    FROM risk_group;
  `
  try {
    return (await db.query(query)).rows
  } catch (error) {
    console.error(error)
    throw new Error('!riskGroups')
  }
}
