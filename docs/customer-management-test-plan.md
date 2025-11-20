# Customer Management - Comprehensive Test Plan

## Application Overview

The Customer Management application is a web-based CRUD system built with Express.js and PostgreSQL that provides:

- **Authentication**: Session-based login with bcrypt password hashing
- **Customer Registration**: Create new customers with name and email validation
- **Customer Listing**: View all customers in a sortable table format
- **Customer Editing**: Update existing customer information
- **Customer Deletion**: Remove customers with confirmation dialog
- **Navigation**: Seamless flow between listing, creation, and editing screens
- **Session Management**: Secure logout functionality

## Test Scenarios

### 1. Customer Registration Flow

**Seed:** `tests/seed.spec.ts`

#### 1.1 Valid Customer Registration - Happy Path
**Steps:**
1. Navigate to login page
2. Enter valid credentials (admin / Demo2024!)
3. Click login button
4. Verify redirection to customers list page
5. Click "新規作成" (new customer) link
6. Verify navigation to new customer form
7. Enter customer name: "田中 太郎"
8. Enter customer email: "tanaka.taro@example.com"
9. Click "登録" (register) button
10. Verify redirection to customers list page
11. Verify new customer appears in the table
12. Verify customer data persisted in database

**Expected Results:**
- Successful login and navigation
- New customer form displays properly
- Customer successfully created and visible in list
- Database contains new customer record
- Customer ID is auto-generated and sequential

#### 1.2 Customer Registration with Edge Cases
**Steps:**
1. Complete login process (steps 1-4 from 1.1)
2. Navigate to new customer form
3. Test empty name field validation
4. Test empty email field validation
5. Test invalid email format: "invalid-email"
6. Test extremely long name (>255 characters)
7. Test special characters in name: "山田 花子-Smith"
8. Test Unicode email: "テスト@example.jp"
9. Verify form validation messages
10. Submit valid data and verify success

**Expected Results:**
- Required field validation prevents empty submissions
- HTML5 email validation catches invalid formats
- Unicode characters handled properly
- Long names either truncated or rejected gracefully

#### 1.3 Duplicate Email Registration
**Steps:**
1. Complete login and navigation
2. Create first customer with email: "duplicate@test.com"
3. Navigate to new customer form again
4. Attempt to create second customer with same email
5. Verify system behavior (success/error based on constraints)

**Expected Results:**
- System behavior depends on DB constraints
- If duplicates allowed: both records created
- If duplicates rejected: appropriate error message

### 2. Customer Listing and Navigation

#### 2.1 Customer List Display
**Steps:**
1. Complete login process
2. Verify customers list page displays
3. Check table headers: ID, Name, Email, 操作
4. Verify existing customers displayed correctly
5. Check customer data formatting
6. Verify action buttons (編集/削除) present for each customer
7. Test list with 0, 1, and multiple customers

**Expected Results:**
- Table structure displays correctly
- All customer data visible and properly formatted
- Action buttons functional and accessible
- Empty state handled gracefully

#### 2.2 Navigation Links
**Steps:**
1. From customers list, test "新規作成" link
2. Verify navigation to new customer form
3. Use browser back button to return to list
4. Test "編集" link for existing customer
5. Verify navigation to edit form with pre-populated data
6. Test navigation consistency across all pages

**Expected Results:**
- All navigation links work correctly
- Browser back/forward navigation works
- Page states maintained properly

### 3. Customer Editing Flow

#### 3.1 Valid Customer Edit - Happy Path
**Steps:**
1. Complete login and navigate to customers list
2. Click "編集" button for existing customer
3. Verify edit form displays with pre-populated data
4. Modify customer name to: "更新された 田中"
5. Modify customer email to: "updated.tanaka@example.com"
6. Click "更新" (update) button
7. Verify redirection to customers list
8. Verify updated data displayed in list
9. Verify changes persisted in database

**Expected Results:**
- Edit form pre-populated with current data
- Updates saved successfully
- Changes reflected in list view
- Database updated with new values
- updated_at timestamp modified

#### 3.2 Customer Edit Validation
**Steps:**
1. Navigate to edit form for existing customer
2. Clear name field and attempt save
3. Clear email field and attempt save
4. Enter invalid email format
5. Test field length limits
6. Verify validation prevents invalid saves
7. Submit valid changes

**Expected Results:**
- Required field validation active
- Invalid data rejected with appropriate messages
- Valid updates processed successfully

#### 3.3 Edit Non-existent Customer
**Steps:**
1. Navigate directly to: `/customers/999999/edit`
2. Verify system handles non-existent customer ID
3. Check error handling and user feedback

**Expected Results:**
- Graceful error handling (404 or redirect)
- No system crashes or unhandled errors

### 4. Customer Deletion Flow

#### 4.1 Customer Deletion with Confirmation
**Steps:**
1. Complete login and navigate to customers list
2. Note current customer count
3. Click "削除" button for a customer
4. Verify confirmation dialog appears
5. Note confirmation message includes customer name
6. Click "OK" in confirmation dialog
7. Verify customer removed from list
8. Verify customer count decreased by 1
9. Verify customer deleted from database

**Expected Results:**
- Confirmation dialog displays customer name
- Customer successfully removed from system
- List updates immediately
- Database record deleted

#### 4.2 Customer Deletion Cancellation
**Steps:**
1. Navigate to customers list
2. Note current customer count
3. Click "削除" button for a customer
4. Click "Cancel" in confirmation dialog
5. Verify customer remains in list
6. Verify customer count unchanged
7. Verify customer still exists in database

**Expected Results:**
- Cancellation prevents deletion
- No changes to customer data
- User remains on same page

#### 4.3 Delete Non-existent Customer
**Steps:**
1. Attempt to POST to `/customers/999999/delete`
2. Verify system handles gracefully
3. Check for error messages or redirects

**Expected Results:**
- No system errors for non-existent IDs
- Appropriate error handling or silent success

### 5. Authentication and Session Management

#### 5.1 Login Required for Customer Operations
**Steps:**
1. Without logging in, navigate to `/customers`
2. Verify redirect to login page
3. Attempt to access `/customers/new` directly
4. Attempt to access `/customers/1/edit` directly
5. Test all protected customer routes

**Expected Results:**
- All customer routes protected by authentication
- Unauthenticated requests redirect to login
- No customer data accessible without login

#### 5.2 Session Persistence
**Steps:**
1. Complete login process
2. Navigate through customer management features
3. Refresh browser page
4. Verify session maintained
5. Test session timeout behavior (if applicable)

**Expected Results:**
- Session persists across page refreshes
- User remains authenticated during normal usage
- Appropriate handling of expired sessions

#### 5.3 Logout Functionality
**Steps:**
1. Complete login and customer operations
2. Click logout button
3. Verify redirect to login page
4. Attempt to navigate back to `/customers`
5. Verify authentication required again

**Expected Results:**
- Logout properly terminates session
- User redirected to login page
- Protected routes require re-authentication

### 6. Data Integrity and Edge Cases

#### 6.1 Database Constraint Handling
**Steps:**
1. Test customer creation with various data types
2. Test SQL injection attempts in form fields
3. Test XSS prevention in name/email fields
4. Verify proper data sanitization

**Expected Results:**
- Database constraints properly enforced
- Security vulnerabilities prevented
- Data properly escaped and validated

#### 6.2 Concurrent User Operations
**Steps:**
1. Simulate multiple users editing same customer
2. Test race conditions in create/update/delete
3. Verify data consistency maintained

**Expected Results:**
- Last-write-wins or proper conflict resolution
- No data corruption from concurrent access

#### 6.3 Browser Compatibility
**Steps:**
1. Test JavaScript confirmation dialogs
2. Test form validation across browsers
3. Verify CSS and layout consistency
4. Test keyboard navigation and accessibility

**Expected Results:**
- Consistent behavior across supported browsers
- JavaScript functions work properly
- Forms accessible via keyboard

### 7. Performance and Scalability

#### 7.1 Large Dataset Handling
**Steps:**
1. Create multiple customers (50-100 records)
2. Test list page load performance
3. Verify pagination (if implemented)
4. Test search/filter functionality (if available)

**Expected Results:**
- Acceptable performance with larger datasets
- UI remains responsive
- Database queries optimized

### 8. Error Handling and Recovery

#### 8.1 Database Connection Failures
**Steps:**
1. Simulate database connection loss
2. Test customer operations during outage
3. Verify error messages and recovery

**Expected Results:**
- Graceful error handling
- User-friendly error messages
- System recovery after database restoration

#### 8.2 Invalid URLs and Routes
**Steps:**
1. Test invalid customer IDs in URLs
2. Test malformed URLs
3. Verify 404 handling

**Expected Results:**
- Proper HTTP status codes
- User-friendly error pages
- No application crashes

## Test Data Requirements

### Initial Database State
- Minimum 2 existing customers for editing/deletion tests
- Valid admin user account: admin/Demo2024!
- Clean database state for consistent test results

### Test Customer Data
```
Customer 1: 太郎 現新, taro@example.com
Customer 2: 花子 比較, hanako@example.com
New Customer: 田中 太郎, tanaka.taro@example.com
Updated Customer: 更新された 田中, updated.tanaka@example.com
```

### Edge Case Test Data
- Empty strings
- Unicode characters: ひらがな, カタカナ, 漢字
- Special characters: -',.@
- Long strings (near field limits)
- Invalid email formats

## Success Criteria

### Functional Requirements
- All CRUD operations work correctly
- Authentication properly protects all routes
- Data validation prevents invalid submissions
- Confirmation dialogs prevent accidental deletions

### Non-Functional Requirements
- Response times under 2 seconds for all operations
- No JavaScript errors in browser console
- Proper error handling for all failure scenarios
- Accessibility compliance for form elements

### Database Requirements
- Data consistency maintained across operations
- Proper constraint enforcement
- Timestamps updated correctly
- No orphaned or corrupted data

## Test Environment Setup

### Prerequisites
- Docker containers running (CUR: port 3001, NEW: port 3002)
- PostgreSQL databases initialized with test data
- Playwright test environment configured
- Browser automation setup complete

### Test Data Reset
Before each test scenario:
1. Reset customers table to initial state (2 customers)
2. Reset sequence counters
3. Clear any session data
4. Verify database connectivity

This comprehensive test plan ensures thorough coverage of all customer management functionality while maintaining consistency with the existing DSL-based testing framework.