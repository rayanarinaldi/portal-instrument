import { useState, type FormEvent } from "react";
import { API_BASE } from "../lib/api";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Trash2, UserPlus, Users } from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  admin_it: "Admin IT",
  section_chief: "Section Chief",
  pic: "PIC",
  foreman: "Foreman",
  teknisi: "Teknisi",
  teknisi_shift: "Teknisi Shift",
  teknisi_harian: "Teknisi Harian",
  asst_manager: "Assistant Manager",
};

const ROLE_OPTIONS = Object.entries(ROLE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

interface UserRecord {
  id: number;
  name: string;
  username: string;
  role: string;
}

interface CreateUserPayload {
  name: string;
  username: string;
  password: string;
  role: string;
}

function getToken() {
  return localStorage.getItem("kalibrasi-token");
}

async function fetchUsers(): Promise<UserRecord[]> {
  const token = getToken();

  const res = await fetch(`${API_BASE}/users`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error("Gagal memuat data pengguna");
  }

  return res.json();
}

async function createUser(data: CreateUserPayload): Promise<UserRecord> {
  const token = getToken();

  const res = await fetch(`${API_BASE}/users`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res
      .json()
      .catch(() => ({ error: "Gagal membuat pengguna" }));
    throw new Error(err.error || "Gagal membuat pengguna");
  }

  return res.json();
}

async function deleteUser(id: number): Promise<void> {
  const token = getToken();

  const res = await fetch(`${API_BASE}/users/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const err = await res
      .json()
      .catch(() => ({ error: "Gagal menghapus pengguna" }));
    throw new Error(err.error || "Gagal menghapus pengguna");
  }
}

export default function UsersManagement() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("teknisi");

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
  });

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({
        title: "Berhasil",
        description: "Pengguna berhasil ditambahkan.",
      });
      setName("");
      setUsername("");
      setPassword("");
      setRole("teknisi");
    },
    onError: (err: Error) => {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({
        title: "Dihapus",
        description: "Pengguna berhasil dihapus.",
      });
    },
    onError: (err: Error) => {
      toast({
        title: "Error",
        description: err.message || "Gagal menghapus pengguna.",
        variant: "destructive",
      });
    },
  });

  if (currentUser?.role !== "admin_it") {
    return (
      <div className="text-center py-20 text-muted-foreground">
        Anda tidak memiliki akses ke halaman ini.
      </div>
    );
  }

  const handleCreate = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!name.trim() || !username.trim() || !password.trim() || !role) {
      toast({
        title: "Data belum lengkap",
        description: "Nama, username, password, dan role wajib diisi.",
        variant: "destructive",
      });
      return;
    }

    createMutation.mutate({
      name: name.trim(),
      username: username.trim(),
      password,
      role,
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Users className="h-4 w-4" />
          <span className="text-sm font-medium">Manajemen Sistem</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Manage Users</h1>
        <p className="text-sm text-muted-foreground">
          Tambah dan kelola akun pengguna sistem.
        </p>
      </div>

      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Tambah Pengguna
          </CardTitle>
          <CardDescription>
            Isi data pengguna baru untuk akses sistem.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form
            onSubmit={handleCreate}
            className="grid grid-cols-1 gap-4 md:grid-cols-2"
          >
            <div className="space-y-1">
              <Label htmlFor="name">Nama</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Masukkan nama"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Masukkan username"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan password"
              />
            </div>

            <div className="space-y-1">
              <Label>Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih role" />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end md:col-span-2">
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Menyimpan..." : "Tambah"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead>Nama</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="py-10 text-center text-muted-foreground"
                >
                  Belum ada pengguna
                </TableCell>
              </TableRow>
            ) : (
              users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell>{u.username}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{ROLE_LABELS[u.role] ?? u.role}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-destructive"
                      disabled={deleteMutation.isPending}
                      onClick={() => deleteMutation.mutate(u.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
