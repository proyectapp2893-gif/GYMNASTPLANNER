import SharedMacrocycleCalendar from '../../../components/shared/SharedMacrocycleCalendar'

export const dynamic = 'force-dynamic'

export default async function SharedMacrocyclePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  return <SharedMacrocycleCalendar token={token} />
}
