```mermaid
graph TD
%% TODO List for Enhanced Diagrams
todo["TODO: Enhanced Diagrams"] -->|1| LandingToBookingFlow["Landing Page → BookingDetailPage Flow"]
todo -->|2| HooksDeepDive["Hooks Deep Dive: Usage & Risks"]
todo -->|3| StateTransitionValidation["State Transition Validation"]
todo -->|4| CustomHooksBreakdown["Custom Hooks Breakdown"]
todo -->|5| InvalidStateRisks["Invalid State Risks & Flaws"]
todo -->|6| FullComponentFlow["Full Component Lifecycle Flow"]
```

---

### 1. **Landing Page → BookingDetailPage Flow**
```mermaid
graph LR
%% Flow from Landing to BookingDetail
LandingPage["LandingPage (ChargerMap)"] -->|"User clicks a charger card<br/>(Navigates with chargerId)"| NextRouter["Next.js Router<br/>(/booking/[id])"]
NextRouter -->|"Dynamically loads"| BookingDetailPage["BookingDetailPage"]
BookingDetailPage -->|"Extracts 'id' from URL"| useParams["useParams()"]
useParams -->|"id: string"| BookingDetailPage
BookingDetailPage -->|"Fetches booking data<br/>(/api/bookings/[id])"| BookingAPI["GET /api/bookings/[id]"]
BookingAPI -->|"Returns booking: { id, host, charger, status }"| BookingDetailPage
BookingDetailPage -->|"If !user"| Redirect["Redirect to /login"]
```

---

### 2. **Hooks Deep Dive: Usage & Risks**
```mermaid
graph TD
%% Hooks Usage Across Components
BookingDetailPage -->|"Manages state"| useState["useState<br/>(user, booking, error, loading, ...)"]
BookingDetailPage -->|"Side effects"| useEffect["useEffect<br/>(checkAuth, holdTimer, codeTimer)"]
BookingDetailPage -->|"Refs for timers"| useRef["useRef<br/>(holdTimerRef, showCodeTimer)"]
BookingDetailPage -->|"Navigation"| useRouter["useRouter<br/>(router.push)"]
BookingDetailPage -->|"URL params"| useParams["useParams<br/>(id extraction)"]

useAuth -->|"Used in"| BookingDetailPage["BookingDetailPage<br/>(Auth check)"]
useBookingActions -->|"Used in"| BookingDetailPage["BookingDetailPage<br/>(Action handlers)"]

%% Risks
useEffect -.->|"Risk: Missing dependencies<br/>(e.g., [booking.holdExpiresAt])"| InvalidState["Invalid State"]
useRef -.->|"Risk: Memory leaks<br/>(Timers not cleared)"| MemoryLeak["Memory Leak"]
useState -.->|"Risk: Stale closures<br/>(e.g., upiPin in callbacks)"| StaleClosure["Stale Closure"]
```

---

### 3. **State Transition Validation**
```mermaid
graph TD
%% Valid State Transitions
PendingHost["pending_host_accept"] -->|"Host approves"| AwaitingDriver["awaiting_driver_arrival"]
PendingHost -->|"Hold expires"| Cancelled["cancelled"]
AwaitingDriver -->|"Code generated"| AwaitingDriver
AwaitingDriver -->|"Host verifies code"| Verified["verified"]
Verified -->|"Duration selected"| Active["active"]
Active -->|"Start charging"| Charging["charging"]
Charging -->|"Stop charging"| CompletedDraft["completed<br/>(billingStatus: draft)"]
CompletedDraft -->|"Host finalizes bill"| CompletedFinalized["completed<br/>(billingStatus: finalized)"]

%% Invalid Transitions (Flaws)
PendingHost -.-x|"Flaw: Direct to 'active'"| Active
AwaitingDriver -.-x|"Flaw: Skip 'verified'"| Active
Verified -.-x|"Flaw: Skip duration selection"| Charging
```

---

### 4. **Custom Hooks Breakdown**
```mermaid
graph TD
%% Custom Hooks Internals
useAuth["useAuth"] -->|"Calls"| SupabaseAuth["supabase.auth.getUser()"]
SupabaseAuth -->|"Sets"| UserState["user: User | null"]
UserState -->|"Derives"| LoadingState["loading: boolean"]

useBookingActions["useBookingActions"] -->|"Takes"| BookingId["bookingId: string"]
BookingId -->|"Used in"| ApiCalls["API Calls:<br/>- cancelBooking<br/>- generateCode<br/>- regenerateCode<br/>- startCharging<br/>- endCharging"]
ApiCalls -->|"Returns"| ActionHandlers["(setLoading, setError) => Promise<void>"]
ActionHandlers -->|"Manages"| SideEffects["Error/Loading State"]
```

---

### 5. **Invalid State Risks & Flaws**
```mermaid
graph TD
%% Risks and Flaws
BookingDetailPage -->|"State: booking.status"| StatusRisk["Risk: Unhandled Status"]
BookingDetailPage -->|"Derived: holdTimeLeft"| HoldExpiryRisk["Risk: Negative Time<br/>(holdTimeLeft < 0)"]
BookingDetailPage -->|"Local: selectedDuration"| DurationRisk["Risk: Null During 'active' Status"]

%% Flaws in Logic
generateCode["generateCode()"] -.->|"Flaw: Double-click generates 2 codes"| RaceCondition["Race Condition"]
startCharging["startCharging()"] -.->|"Flaw: No duration validation"| InvalidAction["Invalid Action"]
fetchBooking["fetchBookingDetails()"] -.->|"Flaw: No error recovery"| StaleData["Stale Data on Failure"]
```

---

### 6. **Full Component Lifecycle Flow**
```mermaid
graph TD
%% Component Lifecycle
Mount["Component Mounts"] -->|"Runs"| AuthCheck["checkAuth()<br/>(useEffect)"]
AuthCheck -->|"User exists"| FetchBooking["fetchBookingDetails()"]
AuthCheck -->|"No user"| RedirectLogin["router.push('/login')"]
FetchBooking -->|"Success"| RenderUI["Render UI Based on booking.status"]
FetchBooking -->|"Error"| ShowError["Render ErrorState"]

RenderUI -->|"User interacts"| ActionHandlers["handleGenerateCode, handleStartCharging, etc."]
ActionHandlers -->|"Updates state"| ReRender["Re-render UI"]
ActionHandlers -->|"API fails"| ShowError

ReRender -->|"Status changes"| ConditionalRender["Render new section"]
ConditionalRender -->|"Timers run"| SideEffects["useEffect Timers"]
SideEffects -->|"Cleanup on unmount"| ClearTimers["Clear holdTimerRef, showCodeTimer"]
```