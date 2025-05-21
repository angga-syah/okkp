const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// Supabase credentials
const supabaseUrl = '';
const supabaseServiceKey = '';

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createAdmin() {
  try {
    const username = '';
    const email = ''; // Using a valid email format
    const plainPassword = '';
    
    // Hash password
    const hashedPassword = await bcrypt.hash(plainPassword, 10);
    
    console.log('Checking if user already exists...');
    
    // Check if user already exists by username
    const { data: existingUser, error: selectError } = await supabase
      .from('users')
      .select()
      .eq('username', username)
      .single();
    
    if (selectError && selectError.code !== 'PGRST116') {
      console.error('Error checking existing user:', selectError);
      return;
    }
    
    if (existingUser) {
      console.log('Admin user already exists:', existingUser.username);
      return;
    }
    
    console.log('Creating new admin user...');
    
    // Create new admin user
    const userId = uuidv4();
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        id: userId,
        email,
        username,
        password: hashedPassword,
        role: '',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();
    
    if (insertError) {
      console.error('Error inserting user:', insertError);
      return;
    }
    
    console.log('Admin user created successfully:', newUser);
  } catch (error) {
    console.error('Error creating admin:', error);
  }
}

createAdmin();