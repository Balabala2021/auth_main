import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
  CircularProgress,
  MenuItem,
} from "@mui/material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
} from "firebase/firestore";
import {
  createUserWithEmailAndPassword,
  getAuth,
  deleteUser,
} from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import Loading from "@/components/Loading";

interface User {
  id: string;
  uid: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string; // 1 = admin, 2 = staff
  createdAt?: string;
}

const roleLabels = {
  admin : "admin",
  staff:  "staff",
};

const Staff: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    role: roleLabels.staff,
  });

  const fetchUsers = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    try {
      setLoading(true);
      const usersQuery = query(
        collection(db, "users")
      );
      const usersSnapshot = await getDocs(usersQuery);
      const usersData = usersSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as User[];

      setUsers(usersData);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleOpen = (user?: User) => {
    if (user) {
      setSelectedUser(user);
      setFormData({
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        password: "",
        role: user.role,
      });
    } else {
      setSelectedUser(null);
      setFormData({
        first_name: "",
        last_name: "",
        email: "",
        password: "",
        role: roleLabels.staff, // Default to staff role
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedUser(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);


    try {
      if (selectedUser) {
        await updateDoc(doc(db, "users", selectedUser.id), {
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          role: formData.role,
        });
      } else {
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          formData.email,
          formData.password
        );

        await addDoc(collection(db, "users"), {
          uid: userCredential.user.uid,
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          role: formData.role,
          createdAt: new Date().toISOString(),
        });
      }
      handleClose();
      await fetchUsers();
    } catch (error) {
      console.error("Error saving user:", error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this staff member?")) {
      setActionLoading(true);
      try {
        await deleteDoc(doc(db, "users", id));
        await fetchUsers();
      } catch (error) {
        console.error("Error deleting user:", error);
      } finally {
        setActionLoading(false);
      }
    }
  };

  const columns: GridColDef[] = [
    {
      field: "name",
      headerName: "Name",
      flex: 1,
      valueGetter: (params) =>
        `${params.row.first_name} ${params.row.last_name}`,
    },
    { field: "email", headerName: "Email", flex: 1 },
    {
      field: "role",
      headerName: "Role",
      flex: 1,
    },
    {
      field: "actions",
      headerName: "Actions",
      flex: 1,
      renderCell: (params) => (
        <Box>
          <Button
            variant="contained"
             sx={{
                background : "#758533",
                mr : 1
              }}
            size="small"
            onClick={() => handleOpen(params.row)}
            disabled={actionLoading}
          >
            Edit
          </Button>
          <Button
            variant="contained"
            color="error"
            size="small"
            onClick={() => handleDelete(params.row.id)}
            disabled={actionLoading}
          >
            Delete
          </Button>
        </Box>
      ),
    },
  ];

  if (loading) {
    return <Loading />;
  }

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
        <Typography variant="h4">Users</Typography>
        <Button
          variant="contained"
          sx={{
                background : "#758533"
              }}
          onClick={() => handleOpen()}
          disabled={actionLoading}
        >
          Add User
        </Button>
      </Box>

      <Box sx={{ height: 400, width: "100%", position: "relative" }}>
        {actionLoading && (
          <Box
            sx={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(255, 255, 255, 0.7)",
              zIndex: 1,
            }}
          >
            <CircularProgress />
          </Box>
        )}
        <DataGrid
          rows={users}
          columns={columns}
          initialState={{
            pagination: {
              paginationModel: { pageSize: 5, page: 0 },
            },
          }}
          pageSizeOptions={[5]}
          checkboxSelection
          disableRowSelectionOnClick
        />
      </Box>

      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>{selectedUser ? "Edit Staff" : "Add Staff"}</DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="First Name"
              fullWidth
              value={formData.first_name}
              onChange={(e) =>
                setFormData({ ...formData, first_name: e.target.value })
              }
              required
              disabled={actionLoading}
            />
            <TextField
              margin="dense"
              label="Last Name"
              fullWidth
              value={formData.last_name}
              onChange={(e) =>
                setFormData({ ...formData, last_name: e.target.value })
              }
              required
              disabled={actionLoading}
            />
            <TextField
              margin="dense"
              label="Email"
              type="email"
              fullWidth
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              required
              disabled={actionLoading}
            />
            {!selectedUser && (
              <TextField
                margin="dense"
                label="Password"
                type="password"
                fullWidth
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                required
                disabled={actionLoading}
              />
            )}
            <TextField
              margin="dense"
              label="Role"
              fullWidth
              select
              value={formData.role}
              onChange={(e) =>
                setFormData({ ...formData, role: e.target.value })
              }
              required
              disabled={actionLoading}
            >
              <MenuItem value={"admin"}>Admin</MenuItem>
              <MenuItem value={"staff"}>Staff</MenuItem>
            </TextField>
          </DialogContent>
          <DialogActions>
            <Button  sx={{
                color : "#758533"
              }} onClick={handleClose} disabled={actionLoading}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              sx={{
                background : "#758533"
              }}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <CircularProgress size={24} />
              ) : selectedUser ? (
                "Update"
              ) : (
                "Add"
              )}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default Staff;
