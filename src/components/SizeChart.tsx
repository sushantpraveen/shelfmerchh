

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { forwardRef } from "react";
import { SizeChartData } from "@/types/product";

const defaultSizeData = [
    { size: "XS", chest: "34-36\"", length: "26\"", sleeve: "7.5\"" },
    { size: "S", chest: "36-38\"", length: "28\"", sleeve: "8.5\"" },
    { size: "M", chest: "40-42\"", length: "29\"", sleeve: "9\"" },
    { size: "L", chest: "44-46\"", length: "30\"", sleeve: "9.5\"" },
    { size: "XL", chest: "48-50\"", length: "31\"", sleeve: "10\"" },
    { size: "XXL", chest: "52-54\"", length: "32\"", sleeve: "10.5\"" },
];

interface SizeChartProps {
    availableSizes?: string[];
    categoryId?: string;
    sizeChartData?: SizeChartData;
    hideTitle?: boolean;
}

export const SizeChart = forwardRef<HTMLDivElement, SizeChartProps>(({ availableSizes, categoryId, sizeChartData, hideTitle }, ref) => {

    // If custom size chart is enabled, use it
    if (sizeChartData?.enabled && sizeChartData.data.length > 0) {
        const headers = sizeChartData.data[0] || [];
        const rows = sizeChartData.data.slice(1);

        return (
            <section ref={ref} id="size-chart" className="space-y-4">
                {!hideTitle && <h2 className="section-title">Size Chart</h2>}
                <div className="rounded-xl border border-border overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-secondary hover:bg-secondary">
                                {headers.map((header, idx) => (
                                    <TableHead key={idx} className="font-semibold text-foreground">{header}</TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rows.map((row, rowIdx) => (
                                <TableRow
                                    key={rowIdx}
                                    className={rowIdx % 2 === 0 ? "bg-background" : "bg-secondary/50 hover:bg-secondary/60"}
                                >
                                    {row.map((cell, cellIdx) => (
                                        <TableCell key={cellIdx} className={cellIdx === 0 ? "font-medium" : ""}>
                                            {cell}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </section>
        );
    }

    // Default Fallback (if not enabled or empty)
    // Only show if explicitly enabled? 
    // The requirement says: "If disabled -> do not show size chart"
    // However, for existing products without the new field, we might want to keep showing the default or hide it.
    // The requirement "If size chart is enabled -> show... If disabled -> do not show" implies explicit control.
    // But currently we always show the default table. 
    // Let's assume for now fallback behavior is preserved if no custom data exists, 
    // OR strictly follow "If disabled -> do not show". 
    // Given "Existing product flow remains unchanged", existing products likely don't have sizeChart field.
    // So if sizeChartData is undefined, we probably act as before (show default).
    // If sizeChartData is present but enabled is false, we HIDE it.

    if (sizeChartData && !sizeChartData.enabled) {
        return null;
    }

    return (
        <section ref={ref} id="size-chart" className="space-y-4">
            {!hideTitle && <h2 className="section-title">Size Chart</h2>}
            <div className="rounded-xl border border-border overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-secondary hover:bg-secondary">
                            <TableHead className="font-semibold text-foreground">Size</TableHead>
                            <TableHead className="font-semibold text-foreground">Chest</TableHead>
                            <TableHead className="font-semibold text-foreground">Length</TableHead>
                            <TableHead className="font-semibold text-foreground">Sleeve</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {defaultSizeData.map((row, idx) => (
                            <TableRow
                                key={row.size}
                                className={idx % 2 === 0 ? "bg-background" : "bg-secondary/50 hover:bg-secondary/60"}
                            >
                                <TableCell className="font-medium">{row.size}</TableCell>
                                <TableCell>{row.chest}</TableCell>
                                <TableCell>{row.length}</TableCell>
                                <TableCell>{row.sleeve}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </section>
    );
});

SizeChart.displayName = "SizeChart";