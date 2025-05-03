# CSE468-Connected-Multi-View-Dashboard
Information Visualization course assignment
## Chocolate Sales Dashboard

### Overview

This project implements an interactive, multi-view dashboard for exploring Chocolate Sales Data using D3.js.

### Components

#### Interactive Data Table

- Allows sorting and filtering on all columns
- Row selection with visual feedback
- Pagination for large datasets
- Selecting a row highlights corresponding data in the charts

#### Time Series Area Chart with Brushing

- Displays monthly sales trends with a focus+context layout
- Users can brush to select a time range
- Selected time range filters data in both the table and bar chart

#### Stacked Bar Chart

- Visualizes sales by category (reused from the previous assignment)
- Selecting a category filters and highlights relevant data in the other views

#### Interactivity & Coordination

- All components are linked through cross-filtering and state management
- Interactions in one view update the others in real time
- Smooth transitions and a responsive layout
- Reset button to clear all selections

#### Code Structure

- Modular code with clear separation of concerns
- Detailed comments explaining key implementation and coordination mechanisms

#### D3.js Concepts Demonstrated

- Brushing and linking
- Event handling
- Coordinated dashboard design
