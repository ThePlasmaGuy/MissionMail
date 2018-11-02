/* Panel Scripts for MissionMail Render Process*/

$('.p-switch').click(function() {
    const target = $(this).attr('target');

    $('#container > div.active').removeClass('active').trigger('p-deactivate');
    $('#' + target).addClass('active').trigger('p-activate');
});

// Missionary Name Autocomplete

$('input.missionary-names').autocomplete({source: Object.keys(missionaries)});