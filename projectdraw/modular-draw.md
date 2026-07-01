```mermaid


graph TD
%% TODO List for Diagrams
todo["TODO: Diagrams to Generate"] -->|1| PropDrilling["Prop Drilling Flow"]
todo -->|2| HooksFlow["Hooks Usage & Data Flow"]
todo -->|3| ApiIntegration["API Integration & Data Fetching"]
todo -->|4| StateManagement["State Management Breakdown"]
todo -->|5| ComponentHierarchy["Component Hierarchy & Conditional Rendering"]
todo -->|6| SideEffects["Side Effects & Cleanup"]
todo -->|7| ErrorHandling["Error Handling & Loading States"]



```

---

### 1. **Prop Drilling Flow**
```mermaid
graph TD
%% Parent -> Child Prop Drilling
BookingDetailPage["BookingDetailPage (Container)"] -->|"booking: { host, charger, status }"| HostApprovalPending
BookingDetailPage -->|"booking: { secretCode, host }<br/>showCode: boolean<br/>onGenerate: () => void"| GenerateCode
BookingDetailPage -->|"selectedDuration: number | null<br/>chargerPowerKw: number<br/>pricePerKwh: number<br/>onSelect: (minutes: number) => void"| DurationSelection
BookingDetailPage -->|"booking: { energyKwh, durationMinutes, cost }<br/>onPaymentSubmit: (pin: string) => void"| PaymentForm
```

---

### 2. **Hooks Usage & Data Flow**
```mermaid
graph LR
%% Hooks Data Flow
useAuth["useAuth()"] -->|"user: User | null<br/>loading: boolean"| BookingDetailPage
useBookingActions["useBookingActions(id)"] -->|"cancelBooking: (setLoading, setError) => void<br/>generateCode: () => Promise<void>"| BookingDetailPage
BookingDetailPage -->|"Calls on API success/failure"| useBookingActions
BookingDetailPage -->|"Sets state: upiPin, showCode, selectedDuration"| LocalState["useState"]
LocalState -->|"Timer logic"| SideEffects["useEffect + useRef"]
```

---

### 3. **API Integration & Data Fetching**
```mermaid
graph TD
%% API Flow
BookingDetailPage -->|"fetch(`/api/bookings/${id}`)"| BookingAPI_GET["GET /api/bookings/[id]"]
BookingAPI_GET -->|"Returns booking data"| BookingDetailPage
BookingDetailPage -->|"fetch POST /generate-code"| BookingAPI_POST_GenCode["POST /api/bookings/[id]/generate-code"]
BookingDetailPage -->|"fetch POST /pay"| BookingAPI_POST_Pay["POST /api/bookings/[id]/pay<br/>Body: { pin: string }"]
BookingAPI_POST_GenCode -->|"Updates booking.secretCode"| BookingDetailPage
BookingAPI_POST_Pay -->|"Updates booking.isPaid"| BookingDetailPage
BookingAPI_GET -->|"Abstracts Supabase DB call"| Supabase["Supabase Client"]
```

---

### 4. **State Management Breakdown**
```mermaid
graph TD
%% State Management
BookingDetailPage -->|"Derived from booking.charger"| chargerPowerKw["chargerPowerKw: number"]
BookingDetailPage -->|"Derived from booking"| holdTimeLeft["holdTimeLeft: number | null<br/>(Calculated from booking.holdExpiresAt)"]
BookingDetailPage -->|"Local state"| localState["upiPin: string<br/>showCode: boolean<br/>selectedDuration: number | null"]
BookingDetailPage -->|"Status: booking.status"| status["pending_host_accept | awaiting_driver_arrival | verified | active | charging | completed"]
status -->|"Determines rendered component"| ConditionalRender["Conditional Rendering"]
```

---

### 5. **Component Hierarchy & Conditional Rendering**
```mermaid
graph TD
%% Component Hierarchy
BookingDetailPage -->|"status === 'pending_host_accept'"| HostApprovalPending
BookingDetailPage -->|"status === 'awaiting_driver_arrival'"| GenerateCode
BookingDetailPage -->|"status === 'verified' || 'active'"| DurationSelection
BookingDetailPage -->|"status === 'charging'"| ChargingActive
BookingDetailPage -->|"status === 'completed' && billingStatus === 'finalized'"| BillSummary
BillSummary -->|"isPaid || paymentSuccess"| PaymentSuccess["Payment Success Confirmation"]
BillSummary -->|"!isPaid"| PaymentForm
```

---

### 6. **Side Effects & Cleanup**
```mermaid
graph TD
%% Side Effects
BookingDetailPage -->|"onMount: checkAuth()"| AuthCheck["useEffect (Auth Check)"]
AuthCheck -->|"onSuccess: fetchBookingDetails()"| DataFetch["fetchBookingDetails()"]
BookingDetailPage -->|"booking.holdExpiresAt changes"| HoldTimer["useEffect (Hold Timer)<br/>Updates holdTimeLeft every 1s"]
HoldTimer -->|"holdTimeLeft <= 0"| StatusRefresh["fetchBookingDetails()"]
BookingDetailPage -->|"showCode === true"| CodeTimer["useEffect (Code Timer)<br/>Hides code after 3.5s"]
BookingDetailPage -->|"onUnmount"| Cleanup["Clear all timers"]
```

---

### 7. **Error Handling & Loading States**
```mermaid
graph TD
%% Error Handling
API["API Calls (fetch)"] -->|"res.ok === false"| SetError["setError( message )"]
API -->|"Network Error (catch)"| SetErrorNetwork["setError('Network error')"]
SetError -->|"Displays"| ErrorState["ErrorState Component"]
BookingDetailPage -->|"loading === true"| LoadingState["LoadingState Component"]
BookingDetailPage -->|"actionLoading === true"| DisabledButtons["Disable Buttons<br/>Show Loading Text"]
```