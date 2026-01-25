# Attendance Widget — Flutter Attendance App

**Status:** Mobile widget / small app

## What it does
A real-time Android Attendance Tracker built using Kotlin, Retrofit, DataStore, and App Widgets.
The app fetches live attendance data from a backend API, stores it locally, and displays key attendance metrics both inside the app and directly on the home screen widget.

## Tech stack
Language: Kotlin,
Architecture: MVVM-style separation,
Networking: Retrofit + OkHttp,
Local Storage: Jetpack DataStore,
Concurrency: Kotlin Coroutines,
UI: XML Layouts,
Widget: Android AppWidgetProvider,
Backend: REST API (JSON response)

## Key features
**Android App**
-Login using username & password
-Fetches live attendance data from backend

Displays:
-Overall attendance percentage
-Subject-wise attendance breakdown
-Classes held vs attended per subject

Calculates:
-Overall attendance
-Subject-wise percentages
-Stores data locally using DataStore
-One-tap refresh to update attendance

**Home Screen Widget**
Displays live overall attendance percentage
Shows:
-Attended / Held classes (e.g. 462 / 556)
-Leaves left to stay above 75%
-Last updated time
-Refresh button to fetch latest attendance without opening the app
-Works even after device reboot (data persists)

## Screenshot

<img width="738" height="1600" alt="image" src="https://github.com/user-attachments/assets/e9868a48-6ce0-44b8-b92c-a8f0a9f51485" />

