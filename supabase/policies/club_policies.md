# Club Table RLS Policies

## Overview
The `club` table is the root of the multi-tenant architecture. All users belong to a club, and all data is isolated by club.

## Policies

### SELECT Policies

#### "Users can view their own club"
- **Operation**: SELECT
- **Who**: All authenticated users
- **What**: Users can only see their own club
- **Logic**: `id = public.get_current_user_club()`
- **Purpose**: Allows users to view their club information

### UPDATE Policies

#### "Admins can update their club"
- **Operation**: UPDATE
- **Who**: Authenticated users with 'admin' role
- **What**: Admins can update their own club information
- **Logic**:
  - USING: User's club matches and user is admin
  - WITH CHECK: Prevents changing club ID
- **Purpose**: Allows club admins to update club settings

### INSERT/DELETE Policies
- **Not implemented**: Club creation/deletion should be handled by system administrators or superadmin users
- **Recommendation**: Create clubs manually or via admin API

## Security Considerations

1. **Multi-tenant Isolation**: The club table is the foundation of tenant isolation
2. **Limited Access**: Regular users cannot see other clubs
3. **Admin Control**: Only admins can modify club settings
4. **Audit Trail**: created_at and updated_at track changes

## Usage Examples

```sql
-- View current user's club
SELECT * FROM club WHERE id = get_current_user_club();

-- Admin updating club name
UPDATE club
SET nombre = 'New Club Name'
WHERE id = get_current_user_club();
```
