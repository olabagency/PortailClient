export interface KanbanColumn {
  id: string
  project_id: string
  name: string
  color: string
  order_index: number
  created_at: string
}

export interface KanbanTask {
  id: string
  project_id: string
  column_id: string
  title: string
  description: string | null
  priority: 'low' | 'medium' | 'high' | 'urgent' | null
  due_date: string | null
  visible_to_client: boolean
  order_index: number
  created_at: string
  updated_at: string
}
