const url = 'https://efyjemzzapcrluqydwzj.supabase.co/rest/v1/?apikey=sb_publishable_XpkWIeELVcJ3Ez3nk2PHjQ__cjeOpIZ';
fetch(url)
  .then(res => res.json())
  .then(data => {
    console.log(data.paths ? Object.keys(data.paths) : data);
  })
  .catch(console.error);
