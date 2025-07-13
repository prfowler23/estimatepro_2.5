require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function createSampleData() {
  console.log('Creating sample data for analytics testing...')
  
  try {
    // Create sample quotes
    const sampleQuotes = [
      {
        quote_number: 'QTE-2025-001-12345',
        customer_name: 'John Smith',
        customer_email: 'john@example.com',
        customer_phone: '(555) 123-4567',
        company_name: 'ABC Corporation',
        building_name: 'Downtown Office Complex',
        building_address: '123 Business Ave, City, State 12345',
        building_height_stories: 10,
        building_height_feet: 120,
        building_type: 'office',
        total_price: 25000,
        status: 'approved',
        notes: 'Sample quote for testing analytics'
      },
      {
        quote_number: 'QTE-2025-001-12346',
        customer_name: 'Jane Doe',
        customer_email: 'jane@example.com',
        customer_phone: '(555) 234-5678',
        company_name: 'XYZ Ltd',
        building_name: 'Tech Center',
        building_address: '456 Innovation Dr, City, State 12345',
        building_height_stories: 15,
        building_height_feet: 180,
        building_type: 'office',
        total_price: 35000,
        status: 'sent',
        notes: 'Another sample quote'
      },
      {
        quote_number: 'QTE-2025-001-12347',
        customer_name: 'Bob Johnson',
        customer_email: 'bob@example.com',
        customer_phone: '(555) 345-6789',
        company_name: 'Johnson Industries',
        building_name: 'Manufacturing Plant',
        building_address: '789 Industrial Blvd, City, State 12345',
        building_height_stories: 8,
        building_height_feet: 96,
        building_type: 'warehouse',
        total_price: 45000,
        status: 'approved',
        notes: 'Large industrial project'
      }
    ]

    console.log('Creating quotes...')
    const { data: quotesData, error: quotesError } = await supabase
      .from('quotes')
      .insert(sampleQuotes)
      .select()

    if (quotesError) {
      throw quotesError
    }

    console.log(`✅ Created ${quotesData.length} sample quotes`)

    // Create sample services for each quote
    const sampleServices = []
    quotesData.forEach((quote, index) => {
      // Add different services to each quote
      if (index === 0) {
        sampleServices.push({
          quote_id: quote.id,
          service_type: 'window_cleaning',
          area_sqft: 2000,
          glass_sqft: 800,
          price: 15000,
          labor_hours: 40,
          setup_hours: 8,
          rig_hours: 4,
          total_hours: 52,
          crew_size: 3,
          equipment_type: 'Platform',
          equipment_days: 2,
          equipment_cost: 1000,
          calculation_details: {}
        })
        sampleServices.push({
          quote_id: quote.id,
          service_type: 'pressure_washing',
          area_sqft: 1500,
          glass_sqft: 0,
          price: 10000,
          labor_hours: 30,
          setup_hours: 6,
          rig_hours: 2,
          total_hours: 38,
          crew_size: 2,
          equipment_type: 'Pressure Washer',
          equipment_days: 1,
          equipment_cost: 500,
          calculation_details: {}
        })
      } else if (index === 1) {
        sampleServices.push({
          quote_id: quote.id,
          service_type: 'facade_maintenance',
          area_sqft: 3000,
          glass_sqft: 1200,
          price: 35000,
          labor_hours: 80,
          setup_hours: 16,
          rig_hours: 8,
          total_hours: 104,
          crew_size: 4,
          equipment_type: 'Scaffolding',
          equipment_days: 5,
          equipment_cost: 2500,
          calculation_details: {}
        })
      } else {
        sampleServices.push({
          quote_id: quote.id,
          service_type: 'gutter_cleaning',
          area_sqft: 5000,
          glass_sqft: 0,
          price: 25000,
          labor_hours: 60,
          setup_hours: 12,
          rig_hours: 6,
          total_hours: 78,
          crew_size: 3,
          equipment_type: 'Lift',
          equipment_days: 3,
          equipment_cost: 1800,
          calculation_details: {}
        })
        sampleServices.push({
          quote_id: quote.id,
          service_type: 'window_cleaning',
          area_sqft: 2500,
          glass_sqft: 1000,
          price: 20000,
          labor_hours: 50,
          setup_hours: 10,
          rig_hours: 5,
          total_hours: 65,
          crew_size: 3,
          equipment_type: 'Platform',
          equipment_days: 2,
          equipment_cost: 1200,
          calculation_details: {}
        })
      }
    })

    console.log('Creating quote services...')
    const { data: servicesData, error: servicesError } = await supabase
      .from('quote_services')
      .insert(sampleServices)
      .select()

    if (servicesError) {
      throw servicesError
    }

    console.log(`✅ Created ${servicesData.length} sample services`)

    console.log('')
    console.log('🎉 Sample data created successfully!')
    console.log('📊 You can now test the analytics at: http://localhost:3000/analytics')
    console.log('')
    console.log('Sample data includes:')
    console.log('- 3 quotes with different statuses')
    console.log('- Multiple services per quote')
    console.log('- Different building types and customers')
    console.log('- Revenue data for charts and metrics')

  } catch (error) {
    console.error('❌ Error creating sample data:', error.message)
  }
}

createSampleData()