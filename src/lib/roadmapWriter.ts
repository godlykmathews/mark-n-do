/**
 * Roadmap to Items converter:
 * Transforms validated RoadmapData into a batch of Item documents for Firestore.
 */

import {
  writeBatch,
  collection,
  serverTimestamp,
  addDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { RoadmapData, RoadmapWeek, RoadmapCheckpoint } from './roadmapSchema';
import { v4 as uuidv4 } from 'uuid';

export interface RoadmapWriteOptions {
  userEmail: string;
  parentFolderId?: string; // If set, roadmap is created inside this folder; else at root
  roadmapId?: string; // Custom roadmap ID; auto-generated if not provided
  collaborators?: string[]; // Additional collaborator emails (will be added to allowedEmails)
}

interface ItemDocData {
  type: 'folder' | 'todo';
  title: string;
  parentId: string | null;
  completed: boolean;
  ownerEmail: string;
  allowedEmails: string[];
  source: 'ai-generated';
  roadmapId: string;
  weekNumber?: number;
  dayNumber?: number;
  order?: number;
  createdAt: Timestamp;
}

/**
 * Convert a RoadmapData object into Firestore items and write them in a batch.
 * Returns the ID of the root roadmap folder created.
 */
export async function createRoadmapItems(
  roadmapData: RoadmapData,
  options: RoadmapWriteOptions
): Promise<string> {
  const normalizedEmail = options.userEmail.toLowerCase().trim();
  const roadmapId = options.roadmapId || uuidv4();
  const allowedEmails = [normalizedEmail, ...(options.collaborators || [])];

  // Create root roadmap folder
  const rootFolderId = uuidv4();
  const rootFolderTitle = `${roadmapData.goal} (${roadmapData.duration})`;

  const batch = writeBatch(db);
  const itemsCollection = collection(db, 'items');

  // Add root folder
  const rootFolderData: ItemDocData = {
    type: 'folder',
    title: rootFolderTitle,
    parentId: options.parentFolderId || null,
    completed: false,
    ownerEmail: normalizedEmail,
    allowedEmails,
    source: 'ai-generated',
    roadmapId,
    createdAt: serverTimestamp() as any,
  };

  // For batch operations, we need to use doc references
  const rootFolderRef = db.collection('items').doc(rootFolderId);
  batch.set(rootFolderRef, rootFolderData);

  // Add week folders and checkpoints
  roadmapData.weeks.forEach((week: RoadmapWeek) => {
    const weekFolderId = uuidv4();
    const weekFolderTitle = `${week.title}`;

    // Week folder
    const weekFolderData: ItemDocData = {
      type: 'folder',
      title: weekFolderTitle,
      parentId: rootFolderId,
      completed: false,
      ownerEmail: normalizedEmail,
      allowedEmails,
      source: 'ai-generated',
      roadmapId,
      weekNumber: week.weekNumber,
      order: week.order ?? 0,
      createdAt: serverTimestamp() as any,
    };

    const weekFolderRef = db.collection('items').doc(weekFolderId);
    batch.set(weekFolderRef, weekFolderData);

    // Checkpoints (todos) under week
    week.checkpoints.forEach((checkpoint: RoadmapCheckpoint) => {
      const checkpointId = uuidv4();
      const checkpointTitle = `Day ${checkpoint.dayNumber}: ${checkpoint.title}`;

      const checkpointData: ItemDocData = {
        type: 'todo',
        title: checkpointTitle,
        parentId: weekFolderId,
        completed: false,
        ownerEmail: normalizedEmail,
        allowedEmails,
        source: 'ai-generated',
        roadmapId,
        weekNumber: week.weekNumber,
        dayNumber: checkpoint.dayNumber,
        order: checkpoint.order ?? 0,
        createdAt: serverTimestamp() as any,
      };

      const checkpointRef = db.collection('items').doc(checkpointId);
      batch.set(checkpointRef, checkpointData);
    });
  });

  // Commit batch
  await batch.commit();

  return rootFolderId;
}

/**
 * Legacy helper: if batch API is not available, fallback to individual adds.
 * Use only if writeBatch fails or is not available in your Firestore version.
 */
export async function createRoadmapItemsLegacy(
  roadmapData: RoadmapData,
  options: RoadmapWriteOptions
): Promise<string> {
  const normalizedEmail = options.userEmail.toLowerCase().trim();
  const roadmapId = options.roadmapId || uuidv4();
  const allowedEmails = [normalizedEmail, ...(options.collaborators || [])];

  const itemsCollection = collection(db, 'items');

  // Create root folder
  const rootFolderRef = await addDoc(itemsCollection, {
    type: 'folder' as const,
    title: `${roadmapData.goal} (${roadmapData.duration})`,
    parentId: options.parentFolderId || null,
    completed: false,
    ownerEmail: normalizedEmail,
    allowedEmails,
    source: 'ai-generated' as const,
    roadmapId,
    createdAt: serverTimestamp(),
  });

  // Create week folders and checkpoints
  for (const week of roadmapData.weeks) {
    const weekFolderRef = await addDoc(itemsCollection, {
      type: 'folder' as const,
      title: week.title,
      parentId: rootFolderRef.id,
      completed: false,
      ownerEmail: normalizedEmail,
      allowedEmails,
      source: 'ai-generated' as const,
      roadmapId,
      weekNumber: week.weekNumber,
      order: week.order ?? 0,
      createdAt: serverTimestamp(),
    });

    // Create checkpoints under week
    for (const checkpoint of week.checkpoints) {
      await addDoc(itemsCollection, {
        type: 'todo' as const,
        title: `Day ${checkpoint.dayNumber}: ${checkpoint.title}`,
        parentId: weekFolderRef.id,
        completed: false,
        ownerEmail: normalizedEmail,
        allowedEmails,
        source: 'ai-generated' as const,
        roadmapId,
        weekNumber: week.weekNumber,
        dayNumber: checkpoint.dayNumber,
        order: checkpoint.order ?? 0,
        createdAt: serverTimestamp(),
      });
    }
  }

  return rootFolderRef.id;
}
