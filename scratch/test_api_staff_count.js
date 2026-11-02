fetch('http://localhost:3000/api/admin/operations/tasks?institution_id=none')
  .then(res => res.json())
  .then(data => {
    console.log('Response data:', data);
  })
  .catch(err => console.error('Fetch error:', err.message));
