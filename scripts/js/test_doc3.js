const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://xsfmhqdgqowgfoppohan.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzZm1ocWRncW93Z2ZvcHBvaGFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwMzk0NzcsImV4cCI6MjA5MjYxNTQ3N30.1tqLatvAWUbhPIDjmvh2RsZQd4l3A66pV7MjE1AOMOI');

async function check() {
  const { data, error } = await supabase.from('player_registration_documents').select('*').limit(1);
  if (data && data.length > 0) {
    console.log(data[0]);
  } else {
    console.log('No documents found', error);
  }
}
check();
