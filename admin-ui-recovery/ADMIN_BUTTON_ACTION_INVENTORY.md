# SmartBus Admin Panel — Button & Action Inventory

**Project**: SmartBus — College Bus Tracker & Campus Transit Safety Console  
**Format**: Strict Master Action Registry (`| Page | Button | Location | Icon | Action | API/Function |`)  
**Total Items Cataloged**: 106  

---

| Page | Button | Location | Icon | Action | API/Function |
|---|---|---|---|---|---|
| Sign In (`/login`) | Sign In to Command Center | `login/page.tsx:87` | `ArrowRight` | Submit credentials form | `POST /auth/login` |
| Master Shell Layout | Sign Out | `layout.tsx:168` | `LogOut` | Clear token and session | `Local authContext.logout() -> /login` |
| Master Shell Layout | SOS Monitor Badge | `layout.tsx:180` | `AlertTriangle` | Navigate to SOS center | `Navigation (/sos-alerts)` |
| Master Shell Layout | View Incident Dispatch | `layout.tsx:217` | `AlertTriangle` | Navigate to emergency alert | `Navigation (/sos-alerts)` |
| Master Shell Layout | Dismiss Emergency Banner | `layout.tsx:220` | `X` | Dismiss active top emergency banner | `Local state setLiveEmergency(null)` |
| Dashboard (`/dashboard`) | SOS Incidents Button | `dashboard/page.tsx:96` | `ShieldAlert` | Navigate to SOS alerts | `Navigation (/sos-alerts)` |
| Dashboard (`/dashboard`) | Fullscreen Map | `dashboard/page.tsx:99` | `Navigation` | Navigate to full live tracking | `Navigation (/live-tracking)` |
| Dashboard (`/dashboard`) | Expand Live Map | `dashboard/page.tsx:159` | `ArrowRight` | Expand live map view | `Navigation (/live-tracking)` |
| Dashboard (`/dashboard`) | View All Notifications | `dashboard/page.tsx:175` | `None` | Navigate to notifications center | `Navigation (/notifications)` |
| Dashboard (`/dashboard`) | View Full Logs | `dashboard/page.tsx:221` | `None` | Navigate to trip logs | `Navigation (/trips)` |
| Live Tracking (`/live-tracking`) | Emergency Monitor | `live-tracking/page.tsx:28` | `ShieldAlert` | Navigate to SOS incident center | `Navigation (/sos-alerts)` |
| Buses (`/buses`) | + Add Bus | `buses/page.tsx:143` | `Plus` | Open new bus modal | `Local state setModal({open: true, bus: null})` |
| Buses (`/buses`) | Close Modal (X) | `buses/page.tsx:42` | `X` | Close bus form modal | `Local state onClose()` |
| Buses (`/buses`) | Cancel Bus Form | `buses/page.tsx:88` | `None` | Close bus form modal without saving | `Local state onClose()` |
| Buses (`/buses`) | Create / Update Bus | `buses/page.tsx:89` | `None` | Submit bus creation or edit form | `POST /buses or PUT /buses/:id` |
| Buses (`/buses`) | Edit Bus | `buses/page.tsx:200` | `Edit2` | Open modal prefilled with bus data | `Local state setModal({open: true, bus: b})` |
| Buses (`/buses`) | Delete Bus | `buses/page.tsx:201` | `Trash2` | Confirm and delete bus record | `DELETE /buses/:id` |
| Drivers (`/drivers`) | + Add Driver | `drivers/page.tsx:149` | `Plus` | Open new driver modal | `Local state setModal({open: true, driver: null})` |
| Drivers (`/drivers`) | Close Modal (X) | `drivers/page.tsx:43` | `X` | Close driver form modal | `Local state onClose()` |
| Drivers (`/drivers`) | Cancel Driver Form | `drivers/page.tsx:96` | `None` | Close driver form modal without saving | `Local state onClose()` |
| Drivers (`/drivers`) | Create Driver / Update | `drivers/page.tsx:97` | `None` | Submit driver creation or edit form | `POST /drivers or PUT /drivers/:id` |
| Drivers (`/drivers`) | Edit Driver | `drivers/page.tsx:201` | `Edit2` | Open modal prefilled with driver data | `Local state setModal({open: true, driver: d})` |
| Drivers (`/drivers`) | Reset Password | `drivers/page.tsx:202` | `KeyRound` | Open password reset modal for driver | `Local state setPasswordModal({open: true, user})` |
| Drivers (`/drivers`) | Delete Driver | `drivers/page.tsx:210` | `Trash2` | Confirm and delete driver profile | `DELETE /drivers/:id` |
| Students (`/students`) | + Add Student | `students/page.tsx:582` | `Plus` | Open new student registration modal | `Local state setModal({open: true, student: null})` |
| Students (`/students`) | Close Modal (X) | `students/page.tsx:238` | `X` | Close student form modal | `Local state onClose()` |
| Students (`/students`) | Cancel Student Form | `students/page.tsx:430` | `None` | Close student modal without saving | `Local state onClose()` |
| Students (`/students`) | Create Student / Save Changes | `students/page.tsx:433` | `None` | Submit student creation or edit form | `POST /students or PUT /students/:id` |
| Students (`/students`) | Edit Student | `students/page.tsx:758` | `Edit2` | Open modal prefilled with student data | `Local state setModal({open: true, student: s})` |
| Students (`/students`) | Reset Password | `students/page.tsx:765` | `KeyRound` | Open password reset modal for student | `Local state setPasswordModal({open: true, user})` |
| Students (`/students`) | Delete Student | `students/page.tsx:774` | `Trash2` | Confirm and delete student account | `DELETE /students/:id` |
| Routes (`/routes`) | + Add Route | `routes/page.tsx:583` | `Plus` | Open new route modal | `Local state setRouteModal({open: true, route: null})` |
| Routes (`/routes`) | Cancel Delete Dialog | `routes/page.tsx:131` | `None` | Dismiss confirmation dialog | `Local state onCancel()` |
| Routes (`/routes`) | Confirm Delete Action | `routes/page.tsx:132` | `None` | Execute confirmed delete callback | `Local state onConfirm()` |
| Routes (`/routes`) | Close Stop Modal (X) | `routes/page.tsx:210` | `X` | Close stop configuration modal | `Local state onCancel()` |
| Routes (`/routes`) | Active Stop Status Chip | `routes/page.tsx:321` | `None` | Set stop status to ACTIVE in form | `Local state setForm(status: ACTIVE)` |
| Routes (`/routes`) | Inactive Stop Status Chip | `routes/page.tsx:325` | `None` | Set stop status to INACTIVE in form | `Local state setForm(status: INACTIVE)` |
| Routes (`/routes`) | Cancel Stop Modal | `routes/page.tsx:334` | `None` | Close stop form without saving | `Local state onCancel()` |
| Routes (`/routes`) | Add Stop / Update Stop | `routes/page.tsx:335` | `None` | Submit stop coordinates and schedule | `POST /routes/:id/stops or PUT /routes/:id/stops/:stopId` |
| Routes (`/routes`) | Close Route Modal (X) | `routes/page.tsx:376` | `X` | Close route edit modal | `Local state onCancel()` |
| Routes (`/routes`) | Active Route Status Chip | `routes/page.tsx:422` | `None` | Set route status to ACTIVE in form | `Local state setForm(status: ACTIVE)` |
| Routes (`/routes`) | Inactive Route Status Chip | `routes/page.tsx:426` | `None` | Set route status to INACTIVE in form | `Local state setForm(status: INACTIVE)` |
| Routes (`/routes`) | Cancel Route Modal | `routes/page.tsx:433` | `None` | Close route modal without saving | `Local state onCancel()` |
| Routes (`/routes`) | Create Route / Update Route | `routes/page.tsx:434` | `None` | Submit route corridor metadata | `POST /routes or PUT /routes/:id` |
| Routes (`/routes`) | Edit Route | `routes/page.tsx:645` | `Edit2` | Open route configuration modal | `Local state setRouteModal({open: true, route: r})` |
| Routes (`/routes`) | Delete Route | `routes/page.tsx:648` | `Trash2` | Open confirmation dialog to delete route | `DELETE /routes/:id` |
| Routes (`/routes`) | Expand / Collapse Route | `routes/page.tsx:652` | `ChevronDown / ChevronUp` | Toggle accordion to inspect stops and buses | `Local state toggleExpand(routeId)` |
| Routes (`/routes`) | Tab: Morning Pickup Stops | `routes/page.tsx:668` | `Sun` | Switch view to morning pickup stops | `Local state setActiveTab(morning)` |
| Routes (`/routes`) | Tab: Evening Return Stops | `routes/page.tsx:675` | `Moon` | Switch view to evening return stops | `Local state setActiveTab(evening)` |
| Routes (`/routes`) | Tab: Active Corridor Buses | `routes/page.tsx:683` | `Bus` | Switch view to assigned fleet buses | `Local state setActiveTab(buses)` |
| Routes (`/routes`) | + Add Stop Button | `routes/page.tsx:755` | `Plus` | Open map-based stop picker modal | `Local state setStopModal({open: true, routeId, stop: null})` |
| Routes (`/routes`) | Move Stop Up | `routes/page.tsx:774` | `ChevronUp` | Increment stop sequence rank | `PUT /routes/:id/stops/reorder` |
| Routes (`/routes`) | Move Stop Down | `routes/page.tsx:783` | `ChevronDown` | Decrement stop sequence rank | `PUT /routes/:id/stops/reorder` |
| Routes (`/routes`) | Edit Stop | `routes/page.tsx:793` | `Edit2` | Open stop modal to adjust location/timing | `Local state setStopModal({open: true, routeId, stop: s})` |
| Routes (`/routes`) | Delete Stop | `routes/page.tsx:799` | `Trash2` | Open confirmation dialog to delete stop | `DELETE /routes/:id/stops/:stopId` |
| Routes (`/routes`) | Live Track Bus | `routes/page.tsx:854` | `Navigation` | Navigate to live fleet map | `Navigation (/live-tracking)` |
| Routes (`/routes`) | Call Driver Phone | `routes/page.tsx:857` | `Phone` | Initiate phone call to assigned driver | `Native tel:{phone}` |
| Route Monitoring (`/route-monitoring`) | Run Boarding Simulation | `route-monitoring/page.tsx:327` | `Play` | Trigger simulated student scan & GPS check | `POST /boarding/simulation/run` |
| Route Monitoring (`/route-monitoring`) | Export CSV Report | `route-monitoring/page.tsx:337` | `Download` | Open export modal for date range selection | `Local state setShowExportModal(true)` |
| Route Monitoring (`/route-monitoring`) | Refresh Monitoring Feed | `route-monitoring/page.tsx:344` | `RefreshCw` | Reload route boarding statistics and logs | `GET /boarding/admin/route/:id` |
| Route Monitoring (`/route-monitoring`) | Close Conflict Dialog (X) | `route-monitoring/page.tsx:425` | `X` | Close conflict resolution dialog | `Local state setResolvingId(null)` |
| Route Monitoring (`/route-monitoring`) | Confirm GPS Boarded | `route-monitoring/page.tsx:455` | `CheckCircle2` | Resolve conflict by marking student boarded | `POST /boarding/conflicts/:id/resolve` |
| Route Monitoring (`/route-monitoring`) | Confirm Not Boarded | `route-monitoring/page.tsx:463` | `XCircle` | Resolve conflict by marking student absent | `POST /boarding/conflicts/:id/resolve` |
| Route Monitoring (`/route-monitoring`) | Status Filter: All | `route-monitoring/page.tsx:489` | `None` | Filter boarding table to show all records | `Local state setStatusFilter(ALL)` |
| Route Monitoring (`/route-monitoring`) | Status Filter: Boarded | `route-monitoring/page.tsx:495` | `None` | Filter boarding table to verified boarded | `Local state setStatusFilter(BOARDED)` |
| Route Monitoring (`/route-monitoring`) | Status Filter: Wrong Bus | `route-monitoring/page.tsx:501` | `None` | Filter boarding table to wrong bus mismatches | `Local state setStatusFilter(WRONG_ROUTE)` |
| Route Monitoring (`/route-monitoring`) | Status Filter: Not Boarded | `route-monitoring/page.tsx:507` | `None` | Filter boarding table to absent students | `Local state setStatusFilter(NOT_BOARDED)` |
| Route Monitoring (`/route-monitoring`) | Download CSV File | `route-monitoring/page.tsx:645` | `Download` | Download generated attendance audit CSV | `GET /boarding/export?routeId=&startDate=&endDate=` |
| Trips (`/trips`) | Trip Status Filter Chips | `trips/page.tsx:32` | `None` | Filter trips by status (All, ACTIVE, COMPLETED, CANCELLED) | `GET /trips?status=` |
| SOS Alerts (`/sos-alerts`) | Refresh Incident Feed | `sos-alerts/page.tsx:162` | `RefreshCw` | Reload SOS incident alert log | `GET /sos` |
| SOS Alerts (`/sos-alerts`) | Filter: All Incidents | `sos-alerts/page.tsx:173` | `ShieldAlert` | Display all incident reports | `Local state setFilter(ALL)` |
| SOS Alerts (`/sos-alerts`) | Filter: Active SOS | `sos-alerts/page.tsx:185` | `AlertTriangle` | Display unacknowledged emergency alerts | `Local state setFilter(NEW)` |
| SOS Alerts (`/sos-alerts`) | Filter: Acknowledged | `sos-alerts/page.tsx:197` | `Clock` | Display acknowledged in-progress alerts | `Local state setFilter(ACKNOWLEDGED)` |
| SOS Alerts (`/sos-alerts`) | Filter: Resolved | `sos-alerts/page.tsx:209` | `CheckCircle2` | Display resolved incidents | `Local state setFilter(RESOLVED)` |
| SOS Alerts (`/sos-alerts`) | Dispatch Acknowledged | `sos-alerts/page.tsx:312` | `AlertCircle` | Mark SOS as acknowledged by command | `PATCH /sos/:id/status {status: ACKNOWLEDGED}` |
| SOS Alerts (`/sos-alerts`) | Mark Resolved | `sos-alerts/page.tsx:322` | `CheckCircle2` | Mark SOS as resolved and stand down | `PATCH /sos/:id/status {status: RESOLVED}` |
| SOS Alerts (`/sos-alerts`) | View Incident on Map | `sos-alerts/page.tsx:331` | `Eye` | Focus emergency radar map on victim coordinates | `Local state setSelectedAlert(a)` |
| SOS Alerts (`/sos-alerts`) | Call Victim Phone | `sos-alerts/page.tsx:415` | `Phone` | Initiate emergency phone call to victim | `Native tel:{phone}` |
| Notifications (`/notifications`) | Mark All Read | `notifications/page.tsx:77` | `CheckCheck` | Mark all incoming notifications as read | `PUT /notifications/mark-all-read` |
| Notifications (`/notifications`) | Audience Role Selector | `notifications/page.tsx:108` | `Users` | Switch broadcast audience (ALL, STUDENT, DRIVER) | `Local state setComposer(recipientRole)` |
| Notifications (`/notifications`) | Broadcast Announcement | `notifications/page.tsx:142` | `Send` | Dispatch push broadcast announcement | `POST /notifications` |
| Registration Requests (`/registration-requests`) | Refresh List | `registration-requests/page.tsx:210` | `RefreshCw` | Reload pending student registration requests | `GET /registration/requests` |
| Registration Requests (`/registration-requests`) | Review & Verify | `registration-requests/page.tsx:310` | `Eye` | Open verification drawer for registration | `GET /registration/requests/:id` |
| Registration Requests (`/registration-requests`) | Close Detail Drawer (X) | `registration-requests/page.tsx:355` | `X` | Close document review drawer | `Local state setSelected(null)` |
| Registration Requests (`/registration-requests`) | View College ID Document | `registration-requests/page.tsx:415` | `ExternalLink` | Fetch signed URL and open College ID image | `GET /registration/requests/:id/document-url?doc=college-id` |
| Registration Requests (`/registration-requests`) | View Bus Slip Document | `registration-requests/page.tsx:442` | `ExternalLink` | Fetch signed URL and open Bus Slip image | `GET /registration/requests/:id/document-url?doc=bus-slip` |
| Registration Requests (`/registration-requests`) | Approve Registration | `registration-requests/page.tsx:512` | `CheckCircle2` | Approve student and provision transit pass | `POST /registration/requests/:id/approve` |
| Registration Requests (`/registration-requests`) | Reject Registration | `registration-requests/page.tsx:535` | `XCircle` | Reject registration with administrator reason | `POST /registration/requests/:id/reject` |
| Registration Requests (`/registration-requests`) | Previous Page | `registration-requests/page.tsx:325` | `ChevronLeft` | Navigate to previous page of registrations | `Local state setPage(p - 1)` |
| Registration Requests (`/registration-requests`) | Next Page | `registration-requests/page.tsx:332` | `ChevronRight` | Navigate to next page of registrations | `Local state setPage(p + 1)` |
| Settings (`/settings`) | Update Password | `settings/page.tsx:45` | `Lock` | Submit password modification form | `PUT /auth/change-password` |
| Reset Password Modal | Close Modal (X) | `ResetPasswordModal.tsx:87` | `X` | Close password reset dialog | `Local state onClose()` |
| Reset Password Modal | Toggle New Password Visibility | `ResetPasswordModal.tsx:142` | `Eye / EyeOff` | Toggle password masking | `Local state setShowNew(!showNew)` |
| Reset Password Modal | Toggle Confirm Visibility | `ResetPasswordModal.tsx:178` | `Eye / EyeOff` | Toggle password confirmation masking | `Local state setShowConfirm(!showConfirm)` |
| Reset Password Modal | Cancel Reset | `ResetPasswordModal.tsx:218` | `None` | Close dialog without changing password | `Local state onClose()` |
| Reset Password Modal | Reset Password Now | `ResetPasswordModal.tsx:222` | `Lock` | Execute administrative password reset | `PUT /auth/admin/reset-password/:id` |
| LiveMap Component | Map Style: Streets | `LiveMap.tsx:467` | `Map` | Switch to MapTiler Street vector tiles | `Leaflet TileLayer URL update` |
| LiveMap Component | Map Style: Dark | `LiveMap.tsx:475` | `Moon` | Switch to MapTiler Dark vector tiles | `Leaflet TileLayer URL update` |
| LiveMap Component | Map Style: Satellite | `LiveMap.tsx:483` | `Satellite` | Switch to MapTiler Hybrid satellite tiles | `Leaflet TileLayer URL update` |
| LiveMap Component | Map Style: Outdoor | `LiveMap.tsx:491` | `Compass` | Switch to MapTiler Outdoor topographic tiles | `Leaflet TileLayer URL update` |
| StopMapPicker Component | Clear Search Text | `StopMapPicker.tsx:288` | `X` | Clear geocoding search input | `Local state setSearchText("")` |
| StopMapPicker Component | Preset: Invertis University | `StopMapPicker.tsx:355` | `MapPin` | Pan map and drop stop pin at campus | `Leaflet map.flyTo(28.2833, 79.4500)` |
| StopMapPicker Component | Preset: Bareilly Junction | `StopMapPicker.tsx:355` | `MapPin` | Pan map and drop stop pin at station | `Leaflet map.flyTo(28.3420, 79.4180)` |
| StopMapPicker Component | Preset: Civil Lines | `StopMapPicker.tsx:355` | `MapPin` | Pan map and drop stop pin at downtown | `Leaflet map.flyTo(28.3610, 79.4170)` |
| StopMapPicker Component | Preset: Satellite Bus Stand | `StopMapPicker.tsx:355` | `MapPin` | Pan map and drop stop pin at bus terminal | `Leaflet map.flyTo(28.3550, 79.4450)` |
| StopMapPicker Component | Preset: Badaun Junction | `StopMapPicker.tsx:355` | `MapPin` | Pan map and drop stop pin at corridor end | `Leaflet map.flyTo(28.0320, 79.1230)` |
