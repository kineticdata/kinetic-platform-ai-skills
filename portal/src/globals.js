import jquery from "jquery";
import moment from "moment";

jquery.ajaxSetup({ xhrFields: { withCredentials: true } });
window.$ = jquery;
window.jQuery = jquery;
window.moment = moment;
