import { redirect } from 'next/navigation'

/** Friendly alias — Family Desk lives at /admin/emails. */
export default function DeskAliasPage() {
  redirect('/admin/emails')
}
