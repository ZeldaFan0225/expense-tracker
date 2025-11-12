import {Button} from "@/components/ui/button"
import {Input} from "@/components/ui/input"
import {Label} from "@/components/ui/label"

export type PreviewRow = {
    id: string
    date: string
    description: string
    category?: string
    amount: number
    splitBy?: number
}

type ImportPreviewTableProps = {
    rows: PreviewRow[]
    onChange: (id: string, updates: Partial<PreviewRow>) => void
    onRemove: (id: string) => void
}

export function ImportPreviewTable({rows, onChange, onRemove}: ImportPreviewTableProps) {
    if (!rows.length) return null

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr_40px] gap-2 text-xs font-medium text-muted-foreground">
                <Label>Date</Label>
                <Label>Description</Label>
                <Label>Category</Label>
                <Label>Amount</Label>
                <Label>Split</Label>
                <span/>
            </div>
            <div className="space-y-3">
                {rows.map((row) => (
                    <div key={row.id}
                         className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr_40px] gap-2 rounded-2xl border p-3">
                        <Input
                            type="date"
                            value={row.date?.slice(0, 10)}
                            onChange={(event) => onChange(row.id, {date: event.target.value})}
                        />
                        <Input
                            value={row.description}
                            onChange={(event) => onChange(row.id, {description: event.target.value})}
                        />
                        <Input
                            value={row.category ?? ""}
                            placeholder="Auto-create"
                            onChange={(event) => onChange(row.id, {category: event.target.value})}
                        />
                        <Input
                            type="number"
                            value={row.amount}
                            onChange={(event) => onChange(row.id, {amount: Number(event.target.value)})}
                        />
                        <Input
                            type="number"
                            min="1"
                            max="10"
                            step="1"
                            value={row.splitBy ?? ""}
                            onChange={(event) =>
                                onChange(row.id, {
                                    splitBy: event.target.value
                                        ? Number(event.target.value)
                                        : undefined,
                                })
                            }
                        />
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => onRemove(row.id)}
                            aria-label="Remove row"
                        >
                            X
                        </Button>
                    </div>
                ))}
            </div>
        </div>
    )
}
