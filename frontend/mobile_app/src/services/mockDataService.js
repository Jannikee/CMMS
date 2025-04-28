// frontend/mobile_app/src/services/mockDataService.js

/**
 * This service provides mock data for testing the app without needing to scan QR codes
 * or have a backend server running
 */
// Mock user for testing
const MOCK_USER = {
  id: 1,
  username: 'testuser',
  email: 'test@example.com',
  role: 'supervisor'
};

// Mock login function
export const mockLogin = (username, password) => {
  // For testing, accept any username/password combination
  // You could add specific credentials if you want
  if (username && password) {
    return {
      access_token: 'mock-jwt-token-for-testing',
      role: MOCK_USER.role,
      username: MOCK_USER.username
    };
  }
  
  throw new Error('Invalid credentials');
};

const MOCK_MACHINES = [
    {
      id: 1,
      name: "Conveyor Belt A1",
      technical_id: "1001",
      location: "Production Floor - North",
      hour_counter: 1250.5,
      description: "Main conveyor belt for assembly line A1",
      last_maintenance: "2025-04-15T10:30:00Z"
    },
    {
      id: 2,
      name: "Hydraulic Press B2",
      technical_id: "1002",
      location: "Forming Station",
      hour_counter: 876.2,
      description: "50-ton hydraulic press for component forming",
      last_maintenance: "2025-04-10T14:45:00Z"
    },
    {
      id: 3,
      name: "CNC Machine C3",
      technical_id: "1003",
      location: "Precision Machining Area",
      hour_counter: 2340.8,
      description: "Computer numerical control milling machine",
      last_maintenance: "2025-04-20T09:15:00Z"
    }
  ];
  
  const MOCK_WORK_ORDERS = {
    daily: [
      {
        id: 101,
        title: "Clean air filter on CNC Machine C3",
        description: "Remove and clean the primary air filter. Replace if damaged.",
        type: "Cleaning",
        status: "open",
        priority: "normal",
        category: "daily_maintenance",
        machine_id: 3,
        location: "Precision Machining Area",
        due_date: "2025-04-28T17:00:00Z",
        tool_requirements: "Filter cleaning kit, compressed air"
      },
      {
        id: 102,
        title: "Lubricate Conveyor Belt A1 rollers",
        description: "Apply specified lubricant to all roller bearings.",
        type: "Lubrication",
        status: "open",
        priority: "normal",
        category: "daily_maintenance",
        machine_id: 1,
        location: "Production Floor - North",
        due_date: "2025-04-28T17:00:00Z",
        tool_requirements: "Grease gun, Type B lubricant"
      },
      {
        id: 103,
        title: "Check hydraulic fluid levels on Press B2",
        description: "Verify hydraulic reservoir level is between min/max indicators.",
        type: "Inspection",
        status: "completed",
        priority: "normal",
        category: "daily_maintenance",
        machine_id: 2,
        location: "Forming Station",
        due_date: "2025-04-28T17:00:00Z",
        tool_requirements: "Inspection form"
      }
    ],
    
    periodic: [
      {
        id: 201,
        title: "Replace hydraulic seals on Press B2",
        description: "Replace all primary hydraulic cylinder seals according to maintenance manual section 4.2.",
        type: "Replacement",
        status: "open",
        priority: "high",
        category: "periodic_maintenance",
        machine_id: 2,
        location: "Forming Station",
        due_date: "2025-05-15T17:00:00Z",
        progress: 0.2,
        timeRemaining: "18 days remaining",
        interval_hours: 1000,
        last_completed_at: 500,
        tool_requirements: "Seal replacement kit #H42, torque wrench, hydraulic pressure gauge"
      },
      {
        id: 202,
        title: "Calibrate CNC Machine C3 axes",
        description: "Perform full calibration of X, Y and Z axes according to procedure C3-CAL-001.",
        type: "Calibration",
        status: "open",
        priority: "normal",
        category: "periodic_maintenance",
        machine_id: 3,
        location: "Precision Machining Area",
        due_date: "2025-05-05T17:00:00Z",
        progress: 0.5,
        timeRemaining: "8 days remaining",
        interval_hours: 500,
        last_completed_at: 2000,
        tool_requirements: "Calibration kit #CNC-05, test blocks, calibration software"
      },
      {
        id: 203,
        title: "Inspect Conveyor Belt A1 alignment",
        description: "Check and adjust belt tracking, tension and alignment.",
        type: "Inspection",
        status: "open",
        priority: "normal",
        category: "periodic_maintenance",
        machine_id: 1,
        location: "Production Floor - North",
        due_date: "2025-05-10T17:00:00Z",
        progress: 0.7,
        timeRemaining: "13 days remaining",
        interval_hours: 500,
        last_completed_at: 1000,
        tool_requirements: "Belt alignment tool, tension gauge"
      }
    ]
  };
  
  const MOCK_SUBSYSTEMS = {
    1: [  // For Machine ID 1 (Conveyor Belt A1)
      {
        id: 11,
        name: "Drive System",
        technical_id: "1001.01",
        description: "Motor and drive components for conveyor operation",
        machine_id: 1,
        component_count: 3
      },
      {
        id: 12,
        name: "Belt Assembly",
        technical_id: "1001.02",
        description: "Main belt and roller components",
        machine_id: 1,
        component_count: 5
      }
    ],
    2: [  // For Machine ID 2 (Hydraulic Press B2)
      {
        id: 21,
        name: "Hydraulic System",
        technical_id: "1002.01",
        description: "Pump, valves, and cylinders",
        machine_id: 2,
        component_count: 4
      },
      {
        id: 22,
        name: "Control Panel",
        technical_id: "1002.02",
        description: "Electric and electronic controls",
        machine_id: 2,
        component_count: 2
      }
    ],
    3: [  // For Machine ID 3 (CNC Machine C3)
      {
        id: 31,
        name: "Spindle Assembly",
        technical_id: "1003.01",
        description: "Main cutting spindle and motor",
        machine_id: 3,
        component_count: 3
      },
      {
        id: 32,
        name: "Axis Control",
        technical_id: "1003.02",
        description: "X, Y, Z axis motors and controllers",
        machine_id: 3,
        component_count: 6
      }
    ]
  };
  
  /**
   * Get a list of mock machines for testing
   */
  export const getMockMachines = () => {
    return [...MOCK_MACHINES];
  };
  
  /**
   * Get a specific mock machine by ID
   */
  export const getMockMachineById = (id) => {
    return MOCK_MACHINES.find(machine => machine.id === parseInt(id));
  };
  
  /**
   * Get mock work orders for a specific type and optionally machine ID
   */
  export const getMockWorkOrders = (type = 'daily', machineId = null) => {
    let orders = MOCK_WORK_ORDERS[type] || [];
    
    if (machineId) {
      orders = orders.filter(order => order.machine_id === parseInt(machineId));
    }
    
    return orders;
  };
  
  /**
   * Get mock work order by ID
   */
  export const getMockWorkOrderById = (id) => {
    const allOrders = [
      ...MOCK_WORK_ORDERS.daily,
      ...MOCK_WORK_ORDERS.periodic
    ];
    
    return allOrders.find(order => order.id === parseInt(id));
  };
  
  /**
   * Get mock subsystems for a specific machine
   */
  export const getMockSubsystemsForMachine = (machineId) => {
    return MOCK_SUBSYSTEMS[machineId] || [];
  };
  
  /**
   * Update a mock machine's hour counter
   */
  export const updateMockMachineHours = (machineId, hours) => {
    const machine = MOCK_MACHINES.find(m => m.id === parseInt(machineId));
    if (machine) {
      machine.hour_counter = parseFloat(hours);
      return { success: true, machine };
    }
    return { success: false, error: "Machine not found" };
  };
  
  /**
   * Update a mock work order's status
   */
  export const updateMockWorkOrderStatus = (workOrderId, status) => {
    let updated = false;
    
    // Check in daily work orders
    MOCK_WORK_ORDERS.daily.forEach(order => {
      if (order.id === parseInt(workOrderId)) {
        order.status = status;
        updated = true;
      }
    });
    
    // Check in periodic work orders if not found
    if (!updated) {
      MOCK_WORK_ORDERS.periodic.forEach(order => {
        if (order.id === parseInt(workOrderId)) {
          order.status = status;
          updated = true;
        }
      });
    }
    
    return { success: updated };
  };