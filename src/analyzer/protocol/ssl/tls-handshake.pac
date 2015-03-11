# Binpac analyzer just for the TLS handshake protocol and nothing else

%include binpac.pac
%include bro.pac

analyzer TLSHandshake withcontext {
	connection: Handshake_Conn;
	flow:       Handshake_Flow;
};

connection Handshake_Conn(bro_analyzer: BroAnalyzer) {
	upflow = Handshake_Flow(true);
	downflow = Handshake_Flow(false);
};

flow Handshake_Flow(is_orig: bool) {
  datagram = Handshake(is_orig) withcontext(connection, this);
}

%include tls-handshake-protocol.pac
%include tls-handshake-analyzer.pac

%include ssl-defs.pac

