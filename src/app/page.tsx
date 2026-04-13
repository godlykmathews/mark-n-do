'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { 
  Box, 
  Container, 
  Typography, 
  AppBar, 
  Toolbar, 
  IconButton,
  Fab,
  Menu,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Link,
  ListItemButton,
  Alert,
  Paper,
  InputBase
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import AddIcon from '@mui/icons-material/Add';
import FolderIcon from '@mui/icons-material/Folder';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteIcon from '@mui/icons-material/Delete';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAppStore } from '@/store/appStore';
import ArrowBreadcrumbs, { BreadcrumbItem } from '@/components/Breadcrumbs';
import { 
  Item, 
  ItemType, 
  subscribeToUserItems, 
  createItem, 
  toggleTodoStatus, 
  addCollaborator, 
  removeCollaborator,
  deleteItem,
  updateItemTitle
} from '@/lib/db';

export const dynamic = 'force-dynamic';

export default function Home() {
  const { user } = useAuth();
  const { currentFolderId, setCurrentFolderId } = useAppStore();
  
  // UI State
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createType, setCreateType] = useState<ItemType>('folder');
  const [newItemTitle, setNewItemTitle] = useState('');
  const [quickTaskTitle, setQuickTaskTitle] = useState('');

  // Collab / Folders Settings State
  const [settingsAnchorEl, setSettingsAnchorEl] = useState<null | HTMLElement>(null);
  const [activeItem, setActiveItem] = useState<Item | null>(null);
  const [collabDialogOpen, setCollabDialogOpen] = useState(false);
  const [collabEmail, setCollabEmail] = useState('');
  const [collabError, setCollabError] = useState('');

  // Edit State
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editItemTitle, setEditItemTitle] = useState('');

  // Delete State
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Live Firebase Data
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.email) return;
    const unsubscribe = subscribeToUserItems(user.email, (fetchedItems) => {
      // Sort: folders first, then todos. Within type, sort by latest.
      const mapped = fetchedItems.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
        // Mock simple sort (you could sort by createdAt instead)
        return b.title.localeCompare(a.title);
      });
      setItems(mapped);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  const handleLogout = async () => {
    await signOut(auth);
  };

  const handleAddClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const openCreateDialog = (type: ItemType) => {
    setCreateType(type);
    setCreateDialogOpen(true);
    handleMenuClose();
  };

  const handleCreateSubmit = async () => {
    if (!newItemTitle.trim() || !user?.email) return;

    let parentAllowedEmails: string[] | undefined;
    if (currentFolderId) {
      const parent = items.find(i => i.id === currentFolderId);
      if (parent) {
        parentAllowedEmails = parent.allowedEmails;
      }
    }

    try {
      await createItem(
        newItemTitle.trim(),
        createType,
        currentFolderId,
        user.email,
        parentAllowedEmails
      );
      setNewItemTitle('');
      setCreateDialogOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleQuickAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTaskTitle.trim() || !user?.email) return;

    let parentAllowedEmails: string[] | undefined;
    if (currentFolderId) {
      const parent = items.find(i => i.id === currentFolderId);
      if (parent) {
        parentAllowedEmails = parent.allowedEmails;
      }
    }

    try {
      await createItem(
        quickTaskTitle.trim(),
        'todo',
        currentFolderId,
        user.email,
        parentAllowedEmails
      );
      setQuickTaskTitle('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleTodo = async (id: string, current: boolean) => {
    try {
      await toggleTodoStatus(id, current);
    } catch (err) {
      console.error(err);
    }
  };

  const openSettingsMenu = (item: Item, e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    setActiveItem(item);
    setSettingsAnchorEl(e.currentTarget);
  };

  const closeSettingsMenu = () => {
    setSettingsAnchorEl(null);
    setActiveItem(null);
  };

  // Utility to collect an item's ID and all descendants' IDs
  const getSubItemIds = (parentId: string): string[] => {
    let ids: string[] = [];
    const children = items.filter(i => i.parentId === parentId);
    children.forEach(child => {
      ids.push(child.id);
      ids = ids.concat(getSubItemIds(child.id));
    });
    return ids;
  };

  const handleSendInvite = async () => {
    if (!collabEmail.trim() || !activeItem) {
      setCollabError('Email is required');
      return;
    }
    if (activeItem.allowedEmails.includes(collabEmail.toLowerCase().trim())) {
      setCollabError('User already has access');
      return;
    }
    // Owner + 4 collaborators = max 5 emails allowed per item constraints
    if (activeItem.allowedEmails.length >= 5) {
      setCollabError('Maximum of 4 collaborators reached.');
      return;
    }

    try {
      const idsToUpdate = [activeItem.id, ...getSubItemIds(activeItem.id)];
      await addCollaborator(idsToUpdate, collabEmail.toLowerCase().trim());
      
      setCollabEmail('');
      setCollabError('');
    } catch (err: any) {
      setCollabError(err.message);
    }
  };

  const handleRemoveCollaborator = async (emailToRemove: string) => {
    if (!activeItem) return;
    try {
      const idsToUpdate = [activeItem.id, ...getSubItemIds(activeItem.id)];
      await removeCollaborator(idsToUpdate, emailToRemove);
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleDeleteActiveItem = () => {
    if (!activeItem) return;
    setDeleteDialogOpen(true);
    setSettingsAnchorEl(null);
  };

  const confirmDeleteActiveItem = async () => {
    if (!activeItem) return;
    try {
      const idsToDelete = [activeItem.id, ...getSubItemIds(activeItem.id)];
      await deleteItem(idsToDelete);
      setDeleteDialogOpen(false);
      setActiveItem(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditActiveItem = () => {
    if (!activeItem) return;
    setEditItemTitle(activeItem.title);
    setEditDialogOpen(true);
    setSettingsAnchorEl(null);
  };

  const handleEditSubmit = async () => {
    if (!activeItem || !editItemTitle.trim()) return;
    try {
      await updateItemTitle(activeItem.id, editItemTitle.trim());
      setEditDialogOpen(false);
      setActiveItem(null);
    } catch (err) {
      console.error(err);
    }
  };

  const getBreadcrumbsPath = (): BreadcrumbItem[] => {
    const path: BreadcrumbItem[] = [];
    let curr = currentFolderId;
    while (curr) {
      const folder = items.find(i => i.id === curr);
      if (folder) {
        path.unshift({ label: folder.title, path: folder.id });
        curr = folder.parentId || null;
      } else {
        break;
      }
    }
    return path;
  };

  const currentItems = items.filter(item => item.parentId === currentFolderId);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        Loading your workspace...
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="static" color="transparent" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Toolbar>
          {currentFolderId && (
            <IconButton edge="start" color="inherit" onClick={() => setCurrentFolderId(null)} sx={{ mr: 1 }}>
              <ArrowBackIcon />
            </IconButton>
          )}
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
            Mark'n'Do
          </Typography>
          <IconButton onClick={handleLogout} color="inherit" edge="end" aria-label="logout">
            <LogoutIcon />
          </IconButton>
        </Toolbar>
      </AppBar>
      
      <Container maxWidth="sm" sx={{ flexGrow: 1, pt: 2, pb: 10, display: 'flex', flexDirection: 'column', position: 'relative' }}>
        
        {/* Breadcrumbs for navigation context */}
        <Box sx={{ mb: 2, mx: -2, px: 2 }}>
          <ArrowBreadcrumbs 
            items={getBreadcrumbsPath()} 
            onItemClick={(path) => {
              if (path === '/') {
                setCurrentFolderId(null);
              } else {
                setCurrentFolderId(path);
              }
            }} 
          />
        </Box>

        {currentItems.length === 0 ? (
          <Box sx={{ mt: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: 0.5 }}>
            <FolderIcon sx={{ fontSize: 64, mb: 2, color: 'text.secondary' }} />
            <Typography variant="h6" gutterBottom>Empty Directory</Typography>
            <Typography variant="body2" align="center">
              Tap the + button below to add a folder or a task list to {currentFolderId ? 'this folder' : 'your home folder'}.
            </Typography>
          </Box>
        ) : (
          <List sx={{ width: '100%' }}>
            {currentItems.map((item) => (
              <ListItem 
                key={item.id} 
                disablePadding
                sx={{ 
                  mb: 1, 
                  border: '1px solid', 
                  borderColor: 'divider', 
                  borderRadius: 2,
                  bgcolor: 'background.default'
                }}
              >
                {item.type === 'folder' ? (
                  <ListItemButton onClick={() => setCurrentFolderId(item.id)} sx={{ px: 2, py: 1.5 }}>
                    <ListItemIcon sx={{ minWidth: 40 }}>
                      <FolderIcon color="action" />
                    </ListItemIcon>
                    <ListItemText primary={item.title} secondary={item.allowedEmails.length > 1 ? `Shared with ${item.allowedEmails.length - 1}` : ''} />
                    <IconButton 
                      edge="end" 
                      onClick={(e) => openSettingsMenu(item, e)}
                      size="small"
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </ListItemButton>
                ) : (
                  <ListItemButton onClick={() => handleToggleTodo(item.id, !!item.completed)} sx={{ px: 2, py: 1.5 }}>
                    <ListItemIcon sx={{ minWidth: 40 }}>
                      <Checkbox
                        edge="start"
                        checked={!!item.completed}
                        tabIndex={-1}
                        disableRipple
                      />
                    </ListItemIcon>
                    <ListItemText 
                      primary={item.title} 
                      sx={{ 
                        textDecoration: item.completed ? 'line-through' : 'none',
                        opacity: item.completed ? 0.6 : 1 
                      }}
                    />
                    <IconButton 
                      edge="end" 
                      onClick={(e) => openSettingsMenu(item, e)}
                      size="small"
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </ListItemButton>
                )}
              </ListItem>
            ))}
          </List>
        )}

        {/* Global Floating Action Button for mobile-first addition */}
        <Fab 
          color="primary" 
          aria-label="add" 
          onClick={handleAddClick}
          sx={{ 
            position: 'fixed', 
            bottom: 32, 
            right: { xs: 16, sm: 'calc(50% - 280px + 16px)' } 
          }}
        >
          <AddIcon />
        </Fab>

        {/* Quick Add Task Bar */}
        <Paper
          component="form"
          onSubmit={handleQuickAddSubmit}
          sx={{
            display: 'flex',
            alignItems: 'center',
            position: 'fixed',
            bottom: 32,
            left: { xs: 16, sm: 'calc(50% - 280px + 16px)' },
            width: { xs: 'calc(100% - 96px)', sm: '464px' }, // Leaves room for the FAB
            height: 56,
            borderRadius: 28, // Matches FAB roughly
            px: 2,
            boxShadow: 3
          }}
        >
          <InputBase
            sx={{ ml: 1, flex: 1 }}
            placeholder="Quick add a task..."
            value={quickTaskTitle}
            onChange={(e) => setQuickTaskTitle(e.target.value)}
          />
          <IconButton type="submit" sx={{ p: '10px' }} aria-label="add task" color="primary">
            <AddIcon />
          </IconButton>
        </Paper>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
        >
          <MenuItem onClick={() => openCreateDialog('folder')}>New Folder</MenuItem>
          <MenuItem onClick={() => openCreateDialog('todo')}>New Task</MenuItem>
        </Menu>

        <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} fullWidth maxWidth="xs">
          <DialogTitle>Create New {createType === 'folder' ? 'Folder' : 'Task'}</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              id="title"
              label={createType === 'folder' ? "Folder Name" : "Task Name"}
              type="text"
              fullWidth
              variant="outlined"
              value={newItemTitle}
              onChange={(e) => setNewItemTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleCreateSubmit();
                }
              }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateSubmit} variant="contained" disableElevation>Create</Button>
          </DialogActions>
        </Dialog>

        {/* Action Menu attached to individual items */}
        <Menu
          anchorEl={settingsAnchorEl}
          open={Boolean(settingsAnchorEl)}
          onClose={closeSettingsMenu}
        >
          <MenuItem onClick={handleEditActiveItem}>
            Edit {activeItem?.type === 'folder' ? 'Folder' : 'Task'}
          </MenuItem>
          <MenuItem 
            onClick={() => {
              setCollabDialogOpen(true);
              setSettingsAnchorEl(null);
            }}
          >
            Manage Collaboration
          </MenuItem>
          <MenuItem onClick={handleDeleteActiveItem} sx={{ color: 'error.main' }}>
            Delete {activeItem?.type === 'folder' ? 'Folder' : 'Task'}
          </MenuItem>
        </Menu>

        {/* Collab Settings Real Modal */}
        <Dialog open={collabDialogOpen} onClose={() => setCollabDialogOpen(false)} fullWidth maxWidth="xs">
          <DialogTitle>Manage Collaboration</DialogTitle>
          <DialogContent>
            {activeItem && (
              <>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Setting up access for: <strong>{activeItem.title}</strong>
                </Typography>
                
                {/* 1 for the owner, up to 4 for collaborators = max length of 5. */}
                <Typography variant="body2" sx={{ mt: 2, mb: 1 }}>
                  Invited Collaborators ({activeItem.allowedEmails.length - 1} / 4 allowed):
                </Typography>
                
                <List dense sx={{ bgcolor: 'background.default', borderRadius: 2, mb: 2 }}>
                  {activeItem.allowedEmails.map((email: string, index: number) => {
                    const isOwner = email === activeItem.ownerEmail;
                    return (
                      <ListItem key={email} secondaryAction={
                        !isOwner && activeItem.ownerEmail === user?.email ? (
                           <IconButton edge="end" aria-label="delete" onClick={() => handleRemoveCollaborator(email)}>
                             <DeleteIcon fontSize="small" />
                           </IconButton>
                        ) : null
                      }>
                        <ListItemText 
                          primary={email} 
                          secondary={isOwner ? 'Owner' : 'Collaborator'} 
                          sx={{ wordBreak: 'break-all' }} 
                        />
                      </ListItem>
                    );
                  })}
                </List>

                {activeItem.ownerEmail === user?.email && activeItem.allowedEmails.length < 5 && (
                  <>
                    <TextField
                      margin="dense"
                      id="email"
                      label="Collaborator Email"
                      type="email"
                      fullWidth
                      variant="outlined"
                      value={collabEmail}
                      onChange={(e) => {
                        setCollabEmail(e.target.value);
                        setCollabError('');
                      }}
                      placeholder="user@gmail.com"
                    />
                    {collabError && (
                      <Alert severity="error" sx={{ mt: 1, p: 0, px: 2 }}>{collabError}</Alert>
                    )}
                    <Button 
                      variant="contained" 
                      disableElevation 
                      fullWidth 
                      sx={{ mt: 1 }}
                      onClick={handleSendInvite}
                      disabled={!collabEmail.trim() || activeItem.allowedEmails.length >= 5}
                    >
                      Invite Editor
                    </Button>
                  </>
                )}
                {activeItem.ownerEmail !== user?.email && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
                    Only the owner ({activeItem.ownerEmail}) can manage collaborators.
                  </Typography>
                )}
              </>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => { setCollabDialogOpen(false); setCollabEmail(''); setCollabError(''); }}>Close</Button>
          </DialogActions>
        </Dialog>

        {/* Edit Item Dialog */}
        <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} fullWidth maxWidth="xs">
          <DialogTitle>Edit {activeItem?.type === 'folder' ? 'Folder' : 'Task'}</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              id="edit-title"
              label="New Title"
              type="text"
              fullWidth
              variant="outlined"
              value={editItemTitle}
              onChange={(e) => setEditItemTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleEditSubmit();
                }
              }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleEditSubmit} variant="contained" disableElevation>Save</Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} fullWidth maxWidth="xs">
          <DialogTitle>Confirm Delete</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete this {activeItem?.type === 'folder' ? 'folder' : 'task'}?
              {activeItem?.type === 'folder' && ' All items inside this folder will also be deleted.'}
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button onClick={confirmDeleteActiveItem} color="error" variant="contained" disableElevation>
              Delete
            </Button>
          </DialogActions>
        </Dialog>

      </Container>
    </Box>
  );
}
