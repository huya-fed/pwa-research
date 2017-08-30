$(function() {
	var url = "https://q.huya.com/index.php?m=Badge&do=getFansNumUpList";

	$.ajax({
		url: url,
		dataType: 'jsonp',
		jsonp:'callback',
		jsonpCallback:'getFansNumUpList',
		cache:true,
		success: function(resp) {
			if(resp.status && resp.status == 200) {
				var template = _.template($('#bestWeekTpl').html());

				$('#bestWeek').html(template({
					data: resp
				}));
			}
		},
		error: function(err) {
		}
	});
})