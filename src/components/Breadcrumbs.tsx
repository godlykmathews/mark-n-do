import React from 'react';
import { Box, Typography, styled } from '@mui/material';

export interface BreadcrumbItem {
  label: string;
  path: string;
}

export interface BreadcrumbsProps {
  /** List of path items. The component will automatically prepend "Home" if not present. */
  items: BreadcrumbItem[];
  /** Click handler for when a breadcrumb is clicked */
  onItemClick: (path: string) => void;
}

// Styled component for the arrow shape using clip-path
const Crumb = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'isFirst' && prop !== 'isLast',
})<{ isFirst: boolean; isLast: boolean }>(({ theme, isFirst, isLast }) => ({
  display: 'flex',
  alignItems: 'center',
  // Adjust padding depending on if it's the first item to account for the arrow indent
  // Reduce right padding for the last item since it doesn't have an outward arrow
  padding: theme.spacing(1, isLast ? 2 : 4, 1, isFirst ? 2 : 5),
  backgroundColor: theme.palette.mode === 'dark' 
    ? (isLast ? theme.palette.grey[700] : theme.palette.grey[800])
    : (isLast ? theme.palette.grey[200] : theme.palette.grey[300]),
  color: isLast ? theme.palette.text.primary : theme.palette.text.secondary,
  // The magic arrow shape:
  // Flat left side for the first item, inward arrow (16px) for subsequent items.
  // Flat right side for the last item, outward arrow (16px) for previous items.
  clipPath: isFirst && isLast
    ? 'none'
    : isFirst
    ? 'polygon(0% 0%, calc(100% - 16px) 0%, 100% 50%, calc(100% - 16px) 100%, 0% 100%)'
    : isLast
    ? 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%, 16px 50%)'
    : 'polygon(0% 0%, calc(100% - 16px) 0%, 100% 50%, calc(100% - 16px) 100%, 0% 100%, 16px 50%)',
  // Negative margin to overlap the arrows neatly
  marginLeft: isFirst ? 0 : '-16px',
  cursor: isLast ? 'default' : 'pointer',
  transition: 'background-color 0.2s, color 0.2s',
  position: 'relative',
  zIndex: isLast ? 1 : 0, 
  '&:hover': {
    backgroundColor: theme.palette.mode === 'dark'
      ? (isLast ? theme.palette.grey[700] : theme.palette.grey[600])
      : (isLast ? theme.palette.grey[200] : theme.palette.grey[400]),
    color: theme.palette.text.primary,
  },
}));

export default function ArrowBreadcrumbs({ items, onItemClick }: BreadcrumbsProps) {
  // Ensure "Home" is always the first item
  const displayItems = 
    items.length > 0 && items[0].label.toLowerCase() === 'home'
      ? items
      : [{ label: 'Home', path: '/' }, ...items];

  return (
    <Box sx={{ overflowX: 'auto', display: 'flex' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'nowrap', borderRadius: 1.5, overflow: 'hidden' }}>
        {displayItems.map((item, index) => {
          const isFirst = index === 0;
          const isLast = index === displayItems.length - 1;

          return (
            <Crumb
              key={`${item.path}-${index}`}
              isFirst={isFirst}
              isLast={isLast}
              onClick={() => {
                if (!isLast) {
                  onItemClick(item.path);
                }
              }}
              // Adjust zIndex so earlier items render above later ones on the overlap (if desired),
              // or vice versa, to ensure the clip-path borders tile correctly.
              style={{ zIndex: displayItems.length - index }}
            >
            <Typography 
              variant="body2" 
              sx={{ fontWeight: isLast ? 600 : 400 }}
              noWrap
            >
              {item.label}
            </Typography>
          </Crumb>
        );
      })}
      </Box>
    </Box>
  );
}
