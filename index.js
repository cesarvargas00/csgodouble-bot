WebFontConfig = {
    google: {
        families: ['Roboto::latin']
    }
};
(function() {
    var wf = document.createElement('script');
    wf.src = 'https://ajax.googleapis.com/ajax/libs/webfont/1/webfont.js';
    wf.type = 'text/javascript';
    wf.async = 'false';
    var s = document.getElementsByTagName('script')[0];
    s.parentNode.insertBefore(wf, s);
})();

(function() {
    var draggable = document.createElement('script');
    draggable.src = '//code.jquery.com/ui/1.11.4/jquery-ui.js';
    draggable.type = 'text/javascript';
    draggable.async = 'false';
    var s = document.getElementsByTagName('script')[0];
    s.parentNode.insertBefore(draggable, s);
})();

var rollValues = [],
    isPlaying = true,
    shouldDouble = false,
    initialBet = 100,
    nextBet = 100,
    goal = 400000,
    cashFlow = 0;

$('<div></div>', {
    id: 'bot-content',
    style: 'font-family:Roboto;position:fixed; z-index:100;bottom:0;left:0;background-color:white;border:5px solid #ff4081;padding:20px 50px;'
}).appendTo('body');

$('<p></p>', {
    id: 'nextBet',
    text: 'Next Bet'
}).appendTo('#bot-content');
$('<p></p>', {
    id: 'initialBet',
    text: 'Initial Bet:'
}).appendTo('#bot-content');
$('<p></p>', {
    id: 'cashFlow',
    text: 'CashFlow : 0'
}).appendTo('#bot-content');

$('<span></span>', {
    id: 'bot-close',
    class: 'glyphicon glyphicon-remove-circle',
    style: 'position: absolute;right: 5px;top: 5px;'
}).appendTo('#bot-content');

$('<p><a></a></p>').appendTo('#bot-content');

updateScreen();

function run(m) {
    setTimeout(function() {
        if (isPlaying) {
            if (cashFlow > goal) {
                isPlaying = false;
            } else {
                if (m.won > 0) {
                    cashFlow += m.won;
                    nextBet = initialBet; //reset last bet
                    bet(initialBet); //bet
                } else {
                    bet(nextBet); //bets nextBet
                    nextBet *= 2; //double nextBet value
                }
            }
            updateScreen(m);
        }
    }, 10000);
}

function updateScreen(m) {
    $('#nextBet').text('Next Bet: ' + nextBet);
    $('#initialBet').text('Initial Bet: ' + initialBet);
    $('#cashFlow').text('Cash Flow: ' + cashFlow);
}

function bet(amount) {
    send({
        "type": "bet",
        "amount": amount,
        "lower": 8,
        "upper": 14,
        "round": ROUND
    });
    cashFlow -= amount;
}

/*
Ok, so from here to the bottom, this is all about their code. I just inserted some stuff on it, so their interactions will still work.
*/

WS.onmessage = onmessage;
WS.onclose = onclose;

function onmessage(msg) {
    try {
        var m = JSON.parse(msg.data);
        if (m.type == "preroll") {
            $("#counter").finish();
            $("#banner").html("Confirming " + m.totalbets + "/" + (m.totalbets + m.inprog) + " total bets...");
            $("#panel0-0 .total").countTo(m.sums[0]);
            $("#panel1-7 .total").countTo(m.sums[1]);
            $("#panel8-14 .total").countTo(m.sums[2]);
            console.log('preroll');
            console.log(m);
            try {
                tinysort("#panel1-7 .betlist>li", {
                    data: "amount",
                    order: "desc"
                });
            } catch (e) {}
            try {
                tinysort("#panel8-14 .betlist>li", {
                    data: "amount",
                    order: "desc"
                });
            } catch (e) {}
            try {
                tinysort("#panel0-0 .betlist>li", {
                    data: "amount",
                    order: "desc"
                });
            } catch (e) {}
        } else if (m.type == "roll") {
            $(".betButton").prop("disabled", true);
            $("#counter").finish();
            $("#banner").html("***ROLLING***");
            ROUND = m.rollid;
            showbets = false;
            spin(m);
            console.log('roll');
            console.log(m);
            run(m);
        } else if (m.type == "chat") {
            chat("player", m.msg, m.name, m.icon, m.user, m.rank, m.lang, m.hide);
        } else if (m.type == "hello") {
            cd(m.count);
            USER = m.user;
            RANK = m.rank;
            $("#balance").countTo(m.balance);
            var last = 0;
            for (var i = 0; i < m.rolls.length; i++) {
                addHist(m.rolls[i].roll, m.rolls[i].rollid);
                last = m.rolls[i].roll;
                ROUND = m.rolls[i].rollid;
            }
            snapRender(last, m.last_wobble);
            MAX_BET = m.maxbet;
            chat("alert", "## Min bet: " + m.minbet + " coin/s");
            chat("alert", "## Max bet: " + formatNum(MAX_BET) + " coins");
            chat("alert", "## Max bets per roll: " + m.br);
            chat("alert", "## Roll countdown: " + m.accept + " sec");
            chat("alert", "## Chat: " + m.chat + " sec cooldown (" + m.chatb + "+ total bet)");
        } else if (m.type == "bet") {
            if (showbets) {
                addBet(m.bet);
                $("#panel0-0 .total").countTo(m.sums[0]);
                $("#panel1-7 .total").countTo(m.sums[1]);
                $("#panel8-14 .total").countTo(m.sums[2]);
            }
        } else if (m.type == "betconfirm") {
            $("#panel" + m.bet.lower + "-" + m.bet.upper + " .mytotal").countTo(m.bet.amount);
            $("#balance").countTo(m.balance, {
                "color": true
            });
            $(".betButton").prop("disabled", false);
            chat("alert", "Bet #" + m.bet.betid + " confirmed " + m.mybr + "/" + m.br + " (" + (m.exec / 1000) + " sec) ");
        } else if (m.type == "error") {
            chat("error", m.error);
            if (m.enable) {
                $(".betButton").prop("disabled", false);
            }
        } else if (m.type == "alert") {
            chat("alert", m.alert);
            if (m.maxbet) {
                MAX_BET = m.maxbet;
            }
            if (!isNaN(m.balance)) {
                console.log("setting balance = %s", m.balance);
                setBalance(m.balance);
                $("#balance").countTo(m.balance, {
                    "color": true
                });
            }
        } else if (m.type == "logins") {
            $("#isonline").html(m.count);
        } else if (m.type == "balance") {
            setBalance(m.balance);
            $("#balance").fadeOut(100).html(todongersb(m.balance)).fadeIn(100);
        }
    } catch (e) {
        console.log("Error: " + msg.data + " " + e);
    }
}

function onclose(event) {
    WS = null;
    chat("italic", "Connection lost... Connecting...");
    connect();
    WS.onclose = onclose;
}