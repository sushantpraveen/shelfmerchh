import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Download, Calendar } from "lucide-react";

interface AuditLog {
  id: string;
  adminId: string;
  action: string;
  targetId: string;
  targetType: string;
  details: any;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
}

export function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([
    {
      id: "1",
      adminId: "admin-001",
      action: "wallet_credit",
      targetId: "wallet-123",
      targetType: "wallet",
      details: { userId: "user-456", amount: 100, description: "Refund", newBalance: 250 },
      ipAddress: "192.168.1.1",
      userAgent: "Mozilla/5.0",
      timestamp: new Date().toISOString(),
    },
    {
      id: "2",
      adminId: "admin-002",
      action: "invoice_update",
      targetId: "inv-789",
      targetType: "invoice",
      details: { oldStatus: "pending", newStatus: "paid", orderId: "order-456" },
      ipAddress: "192.168.1.2",
      userAgent: "Mozilla/5.0",
      timestamp: new Date(Date.now() - 3600000).toISOString(),
    },
  ]);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterAction, setFilterAction] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.adminId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.targetId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.ipAddress?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAction = filterAction === "all" || log.action === filterAction;
    const matchesType = filterType === "all" || log.targetType === filterType;
    
    let matchesDate = true;
    if (startDate && endDate) {
      const logDate = new Date(log.timestamp);
      matchesDate = logDate >= new Date(startDate) && logDate <= new Date(endDate);
    }

    return matchesSearch && matchesAction && matchesType && matchesDate;
  });

  const getActionBadge = (action: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      wallet_credit: "default",
      wallet_debit: "destructive",
      invoice_create: "secondary",
      invoice_update: "outline",
    };
    return variants[action] || "default";
  };

  const exportLogs = () => {
    const csv = [
      ["Timestamp", "Admin ID", "Action", "Target Type", "Target ID", "IP Address", "Details"],
      ...filteredLogs.map((log) => [
        new Date(log.timestamp).toLocaleString(),
        log.adminId,
        log.action,
        log.targetType,
        log.targetId,
        log.ipAddress || "N/A",
        JSON.stringify(log.details),
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString()}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Audit Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by admin, target, or IP..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Select value={filterAction} onValueChange={setFilterAction}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="wallet_credit">Wallet Credit</SelectItem>
                  <SelectItem value="wallet_debit">Wallet Debit</SelectItem>
                  <SelectItem value="invoice_create">Invoice Create</SelectItem>
                  <SelectItem value="invoice_update">Invoice Update</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="wallet">Wallet</SelectItem>
                  <SelectItem value="invoice">Invoice</SelectItem>
                </SelectContent>
              </Select>

              <Button onClick={exportLogs} variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Start Date</label>
                <Input
                  type="datetime-local"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">End Date</label>
                <Input
                  type="datetime-local"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{filteredLogs.length}</div>
                  <p className="text-xs text-muted-foreground">Total Logs</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">
                    {new Set(filteredLogs.map((l) => l.adminId)).size}
                  </div>
                  <p className="text-xs text-muted-foreground">Unique Admins</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">
                    {new Set(filteredLogs.map((l) => l.ipAddress)).size}
                  </div>
                  <p className="text-xs text-muted-foreground">Unique IPs</p>
                </CardContent>
              </Card>
            </div>

            {/* Table */}
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Admin ID</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Target Type</TableHead>
                    <TableHead>Target ID</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        No audit logs found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString()}
                        </TableCell>
                        <TableCell className="font-mono text-sm">{log.adminId}</TableCell>
                        <TableCell>
                          <Badge variant={getActionBadge(log.action)}>
                            {log.action.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="capitalize">{log.targetType}</TableCell>
                        <TableCell className="font-mono text-sm">{log.targetId}</TableCell>
                        <TableCell className="font-mono text-sm">
                          {log.ipAddress || "N/A"}
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs truncate text-sm text-muted-foreground">
                            {JSON.stringify(log.details)}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
