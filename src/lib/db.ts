import { db } from './firebase';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  where,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  writeBatch
} from 'firebase/firestore';

export type ItemType = 'folder' | 'todo';

export interface Item {
  id: string;
  type: ItemType;
  title: string;
  parentId: string | null;
  completed?: boolean;
  ownerEmail: string;
  allowedEmails: string[]; // Includes owner + up to 4 collaborators
  createdAt: any;
}

// Subscribe to all items a user has access to
export const subscribeToUserItems = (email: string, callback: (items: Item[]) => void) => {
  const normalizedEmail = email.toLowerCase().trim();
  const q = query(collection(db, 'items'), where('allowedEmails', 'array-contains', normalizedEmail));
  return onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Item[];
    callback(items);
  });
};

// Create a new folder or task
export const createItem = async (
  title: string, 
  type: ItemType, 
  parentId: string | null, 
  userEmail: string,
  parentAllowedEmails?: string[]
) => {
  const normalizedEmail = userEmail.toLowerCase().trim();
  // If inheriting a parent, use its allowed emails, else just the owner
  const allowedEmails = parentAllowedEmails || [normalizedEmail];
  
  await addDoc(collection(db, 'items'), {
    title,
    type,
    parentId,
    completed: false, // Default for todos, ignored by folders in UI
    ownerEmail: normalizedEmail,
    allowedEmails,
    createdAt: serverTimestamp()
  });
};

// Toggle a todo's completion status
export const toggleTodoStatus = async (id: string, currentStatus: boolean) => {
  const itemRef = doc(db, 'items', id);
  await updateDoc(itemRef, {
    completed: !currentStatus
  });
};

// Add a collaborator to a folder and all its child items
export const addCollaborator = async (itemIds: string[], emailToAdd: string) => {
  const batch = writeBatch(db);
  const normalizedEmail = emailToAdd.toLowerCase().trim();
  
  itemIds.forEach(id => {
    const itemRef = doc(db, 'items', id);
    batch.update(itemRef, {
      allowedEmails: arrayUnion(normalizedEmail)
    });
  });
  
  await batch.commit();
};

// Remove a collaborator from a folder and all its child items
export const removeCollaborator = async (itemIds: string[], emailToRemove: string) => {
  const batch = writeBatch(db);
  const normalizedEmail = emailToRemove.toLowerCase().trim();
  
  itemIds.forEach(id => {
    const itemRef = doc(db, 'items', id);
    batch.update(itemRef, {
      allowedEmails: arrayRemove(normalizedEmail)
    });
  });
  
  await batch.commit();
};

// Utility to delete an item and all its descendants
export const deleteItem = async (itemIds: string[]) => {
  const batch = writeBatch(db);
  
  itemIds.forEach(id => {
    const itemRef = doc(db, 'items', id);
    batch.delete(itemRef);
  });
  
  await batch.commit();
};