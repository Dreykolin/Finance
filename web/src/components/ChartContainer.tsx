interface Props {
  title: string
  children: React.ReactNode
}

export default function ChartContainer({ title, children }: Props) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl py-5">
      <p className="text-zinc-500 text-[10px] font-extrabold tracking-widest uppercase px-5 mb-4">
        {title}
      </p>
      <div className="px-2">{children}</div>
    </div>
  )
}
