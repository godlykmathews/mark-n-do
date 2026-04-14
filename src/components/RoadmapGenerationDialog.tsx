'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Box,
  Typography,
} from '@mui/material';
import { RoadmapData } from '@/lib/roadmapSchema';

export interface RoadmapGenerationDialogProps {
  open: boolean;
  onClose: () => void;
  onGenerated: (roadmapData: RoadmapData) => void;
  loading?: boolean;
  error?: string | null;
}

export function RoadmapGenerationDialog({
  open,
  onClose,
  onGenerated,
  loading = false,
  error = null,
}: RoadmapGenerationDialogProps) {
  const [goal, setGoal] = useState('');
  const [duration, setDuration] = useState('4 weeks');
  const [durationWeeks, setDurationWeeks] = useState(4);
  const [intensity, setIntensity] = useState<'light' | 'medium' | 'intensive'>('medium');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleGenerateClick = async () => {
    setLocalError(null);

    if (!goal.trim()) {
      setLocalError('Goal is required.');
      return;
    }

    if (durationWeeks < 1 || durationWeeks > 52) {
      setLocalError('Duration must be between 1 and 52 weeks.');
      return;
    }

    try {
      const response = await fetch('/api/roadmap/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal: goal.trim(),
          duration,
          durationWeeks,
          intensity,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success || !data.roadmap) {
        throw new Error(data.error || 'Failed to generate roadmap.');
      }

      // Reset form and call callback
      setGoal('');
      setDuration('4 weeks');
      setDurationWeeks(4);
      setIntensity('medium');
      onGenerated(data.roadmap);
      onClose();
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Unknown error.');
    }
  };

  const handleDurationWeekChange = (value: number) => {
    setDurationWeeks(value);
    if (value === 1) setDuration('1 week');
    else if (value === 4) setDuration('1 month');
    else if (value === 12) setDuration('3 months');
    else setDuration(`${value} weeks`);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Generate AI Roadmap</DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        {(error || localError) && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error || localError}
          </Alert>
        )}

        <TextField
          autoFocus
          fullWidth
          label="Goal"
          placeholder="e.g., Learn Web Development, Build a React App"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          disabled={loading}
          sx={{ mb: 2 }}
          multiline
          rows={2}
        />

        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Duration (weeks)</InputLabel>
          <Select
            value={durationWeeks}
            label="Duration (weeks)"
            onChange={(e) => handleDurationWeekChange(e.target.value as number)}
            disabled={loading}
          >
            <MenuItem value={1}>1 week</MenuItem>
            <MenuItem value={2}>2 weeks</MenuItem>
            <MenuItem value={4}>4 weeks (1 month)</MenuItem>
            <MenuItem value={8}>8 weeks (2 months)</MenuItem>
            <MenuItem value={12}>12 weeks (3 months)</MenuItem>
            <MenuItem value={24}>24 weeks (6 months)</MenuItem>
            <MenuItem value={52}>52 weeks (1 year)</MenuItem>
          </Select>
        </FormControl>

        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Intensity</InputLabel>
          <Select
            value={intensity}
            label="Intensity"
            onChange={(e) => setIntensity(e.target.value as 'light' | 'medium' | 'intensive')}
            disabled={loading}
          >
            <MenuItem value="light">Light (30-45 min/day)</MenuItem>
            <MenuItem value="medium">Medium (1-2 hours/day)</MenuItem>
            <MenuItem value="intensive">Intensive (2-3 hours/day)</MenuItem>
          </Select>
        </FormControl>

        {loading && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
            <CircularProgress size={20} />
            <Typography variant="body2" color="text.secondary">
              Generating roadmap...
            </Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleGenerateClick}
          variant="contained"
          disableElevation
          disabled={loading}
        >
          {loading ? 'Generating...' : 'Generate Roadmap'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
