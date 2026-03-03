## Task ID: 8 - LOCATION TAXONOMY INTEGRATION
### Work Task
Integrate City/Province location taxonomy across the platform:
1. Add cityId to Project and Material models
2. Update APIs with location filter
3. Create Supplier Directory page
4. Update Jobs page with location filter
5. Update Sidebar navigation

### Work Summary

**1. Schema Changes (`prisma/schema.prisma`):**

- Updated `Project` model:
  - Replaced `location: String?` with `cityId: String?`
  - Added `address: String?` for detailed address
  - Added `city` relation to City model

- Updated `Material` model:
  - Replaced `location: String?` with `cityId: String?`
  - Added `address: String?` for detailed address
  - Added `city` relation to City model

- Updated `City` model:
  - Added `projects: Project[]` relation
  - Added `materials: Material[]` relation

**2. Project API Updates (`/api/projects/route.ts`):**

- Added `cityId` and `provinceId` to filter schema
- Updated GET to filter by city and province
- Updated GET to include city relation with province
- Updated POST to accept cityId and address
- Added city validation for project creation

**3. Material API Updates (`/api/materials/route.ts`):**

- Added `cityId` and `provinceId` to query params
- Updated where clause to filter by city/province
- Updated include to fetch city relation with province
- Updated create to use cityId instead of location string

**4. Supplier Directory API (`/api/directory/suppliers/route.ts`):**

- New endpoint for listing verified suppliers
- Filters: search, cityId, provinceId, minRating
- Sorting: rating, totalProjects, reviews, name
- Pagination support
- Returns city with province info

**5. Supplier Directory Page (`/dashboard/directory/suppliers/page.tsx`):**

- Search and filter by province, city, rating
- Sorting options
- Grid display of supplier cards
- Shows city/province location
- Link to public profile
- Pagination

**6. Jobs Page Update (`/dashboard/jobs/page.tsx`):**

- Replaced hardcoded location dropdown with dynamic Province/City selectors
- Fetches provinces and cities from API
- Filters cities based on selected province
- Uses cityId and provinceId for API calls
- Shows city name with province in job cards
- Updated dialog to show location from city relation

**7. Sidebar Updates:**

- CLIENT: Added "Cari Supplier" to Direktori submenu
- SUPPLIER: Added "Direktori Vendor" and "Direktori Tukang" menu items

**Key Features Implemented:**
- Complete location taxonomy integration
- Dynamic province/city filtering
- All 38 Indonesian provinces and 395 cities available
- Consistent location display format: "City, Province"
- Hierarchical filtering (province → city)

**Files Created:**
- `src/app/api/directory/suppliers/route.ts`
- `src/app/(dashboard)/dashboard/directory/suppliers/page.tsx`

**Files Modified:**
- `prisma/schema.prisma`
- `src/app/api/projects/route.ts`
- `src/app/api/materials/route.ts`
- `src/app/(dashboard)/dashboard/jobs/page.tsx`
- `src/components/layout/Sidebar.tsx`

**Lint Status:** All checks passing
**Database:** Schema pushed successfully

---
