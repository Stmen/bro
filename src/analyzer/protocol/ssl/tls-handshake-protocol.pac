######################################################################
# Handshake Protocols (7.)
######################################################################

enum HandshakeType {
	HELLO_REQUEST       = 0,
	CLIENT_HELLO        = 1,
	SERVER_HELLO        = 2,
	SESSION_TICKET      = 4, # RFC 5077
	CERTIFICATE         = 11,
	SERVER_KEY_EXCHANGE = 12,
	CERTIFICATE_REQUEST = 13,
	SERVER_HELLO_DONE   = 14,
	CERTIFICATE_VERIFY  = 15,
	CLIENT_KEY_EXCHANGE = 16,
	FINISHED            = 20,
	CERTIFICATE_URL     = 21, # RFC 3546
	CERTIFICATE_STATUS  = 22, # RFC 3546
};


######################################################################
# V3 Handshake Protocol (7.)
######################################################################

type UnknownHandshake(hs: Handshake, is_orig: bool) = record {
	data : bytestring &restofdata &transient;
};

type Handshake(is_orig: bool) = record {
	body : case msg_type of {
		HELLO_REQUEST       -> hello_request       : HelloRequest(this);
		CLIENT_HELLO        -> client_hello        : ClientHello(this);
		SERVER_HELLO        -> server_hello        : ServerHello(this);
		SESSION_TICKET      -> session_ticket      : SessionTicketHandshake(this);
		CERTIFICATE         -> certificate         : Certificate(this);
		SERVER_KEY_EXCHANGE -> server_key_exchange : ServerKeyExchange(this);
		CERTIFICATE_REQUEST -> certificate_request : CertificateRequest(this);
		SERVER_HELLO_DONE   -> server_hello_done   : ServerHelloDone(this);
		CERTIFICATE_VERIFY  -> certificate_verify  : CertificateVerify(this);
		CLIENT_KEY_EXCHANGE -> client_key_exchange : ClientKeyExchange(this);
		FINISHED            -> finished            : Finished(this);
		CERTIFICATE_URL     -> certificate_url     : bytestring &restofdata &transient;
		CERTIFICATE_STATUS  -> certificate_status  : CertificateStatus(this);
		default             -> unknown_handshake   : UnknownHandshake(this, is_orig);
	} &length = msg_length;
} &byteorder = bigendian,
	&let {
	msg_type: uint8 = $context.connection.msg_type();
	msg_length: uint32 = $context.connection.msg_length();
};

######################################################################
# V3 Hello Request (7.4.1.1.)
######################################################################

# Hello Request is empty
type HelloRequest(rec: Handshake) = empty;


######################################################################
# V3 Client Hello (7.4.1.2.)
######################################################################

type ClientHello(rec: Handshake) = record {
	client_version : uint16;
	gmt_unix_time : uint32;
	random_bytes : bytestring &length = 28;
	session_len : uint8;
	session_id : uint8[session_len];
	csuit_len : uint16 &check(csuit_len > 1 && csuit_len % 2 == 0);
	csuits : uint16[csuit_len/2];
	cmeth_len : uint8 &check(cmeth_len > 0);
	cmeths : uint8[cmeth_len];
	# This weirdness is to deal with the possible existence or absence
	# of the following fields.
	ext_len: uint16[] &until($element == 0 || $element != 0);
	extensions : SSLExtension(rec)[] &until($input.length() == 0);
};

######################################################################
# V3 Server Hello (7.4.1.3.)
######################################################################

type ServerHello(rec: Handshake) = record {
	server_version : uint16;
	gmt_unix_time : uint32;
	random_bytes : bytestring &length = 28;
	session_len : uint8;
	session_id : uint8[session_len];
	cipher_suite : uint16[1];
	compression_method : uint8;
	# This weirdness is to deal with the possible existence or absence
	# of the following fields.
	ext_len: uint16[] &until($element == 0 || $element != 0);
	extensions : SSLExtension(rec)[] &until($input.length() == 0);
} &let {
	cipher_set : bool =
		$context.connection.set_cipher(cipher_suite[0]);
};

######################################################################
# V3 Server Certificate (7.4.2.)
######################################################################

type X509Certificate = record {
	length : uint24;
	certificate : bytestring &length = to_int()(length);
};

type Certificate(rec: Handshake) = record {
	length : uint24;
	certificates : X509Certificate[] &until($input.length() == 0);
} &length = to_int()(length)+3;

# OCSP Stapling

type CertificateStatus(rec: Handshake) = record {
	status_type: uint8; # 1 = ocsp, everything else is undefined
	length : uint24;
	response: bytestring &restofdata;
};

######################################################################
# V3 Server Key Exchange Message (7.4.3.)
######################################################################

# Usually, the server key exchange does not contain any information
# that we are interested in.
#
# The exception is when we are using an ECDHE, DHE or DH-Anon suite.
# In this case, we can extract information about the chosen cipher from
# here.
type ServerKeyExchange(rec: Handshake) = case $context.connection.chosen_cipher() of {
	TLS_ECDH_ECDSA_WITH_NULL_SHA,
	TLS_ECDH_ECDSA_WITH_RC4_128_SHA,
	TLS_ECDH_ECDSA_WITH_3DES_EDE_CBC_SHA,
	TLS_ECDH_ECDSA_WITH_AES_128_CBC_SHA,
	TLS_ECDH_ECDSA_WITH_AES_256_CBC_SHA,
	TLS_ECDHE_ECDSA_WITH_NULL_SHA,
	TLS_ECDHE_ECDSA_WITH_RC4_128_SHA,
	TLS_ECDHE_ECDSA_WITH_3DES_EDE_CBC_SHA,
	TLS_ECDHE_ECDSA_WITH_AES_128_CBC_SHA,
	TLS_ECDHE_ECDSA_WITH_AES_256_CBC_SHA,
	TLS_ECDH_RSA_WITH_NULL_SHA,
	TLS_ECDH_RSA_WITH_RC4_128_SHA,
	TLS_ECDH_RSA_WITH_3DES_EDE_CBC_SHA,
	TLS_ECDH_RSA_WITH_AES_128_CBC_SHA,
	TLS_ECDH_RSA_WITH_AES_256_CBC_SHA,
	TLS_ECDHE_RSA_WITH_NULL_SHA,
	TLS_ECDHE_RSA_WITH_RC4_128_SHA,
	TLS_ECDHE_RSA_WITH_3DES_EDE_CBC_SHA,
	TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA,
	TLS_ECDHE_RSA_WITH_AES_256_CBC_SHA,
	TLS_ECDH_ANON_WITH_NULL_SHA,
	TLS_ECDH_ANON_WITH_RC4_128_SHA,
	TLS_ECDH_ANON_WITH_3DES_EDE_CBC_SHA,
	TLS_ECDH_ANON_WITH_AES_128_CBC_SHA,
	TLS_ECDH_ANON_WITH_AES_256_CBC_SHA,
	TLS_ECDHE_ECDSA_WITH_AES_128_CBC_SHA256,
	TLS_ECDHE_ECDSA_WITH_AES_256_CBC_SHA384,
	TLS_ECDH_ECDSA_WITH_AES_128_CBC_SHA256,
	TLS_ECDH_ECDSA_WITH_AES_256_CBC_SHA384,
	TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA256,
	TLS_ECDHE_RSA_WITH_AES_256_CBC_SHA384,
	TLS_ECDH_RSA_WITH_AES_128_CBC_SHA256,
	TLS_ECDH_RSA_WITH_AES_256_CBC_SHA384,
	TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256,
	TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384,
	TLS_ECDH_ECDSA_WITH_AES_128_GCM_SHA256,
	TLS_ECDH_ECDSA_WITH_AES_256_GCM_SHA384,
	TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256,
	TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384,
	TLS_ECDH_RSA_WITH_AES_128_GCM_SHA256,
	TLS_ECDH_RSA_WITH_AES_256_GCM_SHA384,
	TLS_ECDHE_PSK_WITH_RC4_128_SHA,
	TLS_ECDHE_PSK_WITH_3DES_EDE_CBC_SHA,
	TLS_ECDHE_PSK_WITH_AES_128_CBC_SHA,
	TLS_ECDHE_PSK_WITH_AES_256_CBC_SHA,
	TLS_ECDHE_PSK_WITH_AES_128_CBC_SHA256,
	TLS_ECDHE_PSK_WITH_AES_256_CBC_SHA384,
	TLS_ECDHE_PSK_WITH_NULL_SHA,
	TLS_ECDHE_PSK_WITH_NULL_SHA256,
	TLS_ECDHE_PSK_WITH_NULL_SHA384,
	TLS_ECDHE_ECDSA_WITH_ARIA_128_CBC_SHA256,
	TLS_ECDHE_ECDSA_WITH_ARIA_256_CBC_SHA384,
	TLS_ECDH_ECDSA_WITH_ARIA_128_CBC_SHA256,
	TLS_ECDH_ECDSA_WITH_ARIA_256_CBC_SHA384,
	TLS_ECDHE_RSA_WITH_ARIA_128_CBC_SHA256,
	TLS_ECDHE_RSA_WITH_ARIA_256_CBC_SHA384,
	TLS_ECDH_RSA_WITH_ARIA_128_CBC_SHA256,
	TLS_ECDH_RSA_WITH_ARIA_256_CBC_SHA384,
	TLS_ECDHE_ECDSA_WITH_ARIA_128_GCM_SHA256,
	TLS_ECDHE_ECDSA_WITH_ARIA_256_GCM_SHA384,
	TLS_ECDH_ECDSA_WITH_ARIA_128_GCM_SHA256,
	TLS_ECDH_ECDSA_WITH_ARIA_256_GCM_SHA384,
	TLS_ECDHE_RSA_WITH_ARIA_128_GCM_SHA256,
	TLS_ECDHE_RSA_WITH_ARIA_256_GCM_SHA384,
	TLS_ECDH_RSA_WITH_ARIA_128_GCM_SHA256,
	TLS_ECDH_RSA_WITH_ARIA_256_GCM_SHA384,
	TLS_ECDHE_PSK_WITH_ARIA_128_CBC_SHA256,
	TLS_ECDHE_PSK_WITH_ARIA_256_CBC_SHA384,
	TLS_ECDHE_ECDSA_WITH_CAMELLIA_128_CBC_SHA256,
	TLS_ECDHE_ECDSA_WITH_CAMELLIA_256_CBC_SHA384,
	TLS_ECDH_ECDSA_WITH_CAMELLIA_128_CBC_SHA256,
	TLS_ECDH_ECDSA_WITH_CAMELLIA_256_CBC_SHA384,
	TLS_ECDHE_RSA_WITH_CAMELLIA_128_CBC_SHA256,
	TLS_ECDHE_RSA_WITH_CAMELLIA_256_CBC_SHA384,
	TLS_ECDH_RSA_WITH_CAMELLIA_128_CBC_SHA256,
	TLS_ECDH_RSA_WITH_CAMELLIA_256_CBC_SHA384,
	TLS_ECDHE_ECDSA_WITH_CAMELLIA_128_GCM_SHA256,
	TLS_ECDHE_ECDSA_WITH_CAMELLIA_256_GCM_SHA384,
	TLS_ECDH_ECDSA_WITH_CAMELLIA_128_GCM_SHA256,
	TLS_ECDH_ECDSA_WITH_CAMELLIA_256_GCM_SHA384,
	TLS_ECDHE_RSA_WITH_CAMELLIA_128_GCM_SHA256,
	TLS_ECDHE_RSA_WITH_CAMELLIA_256_GCM_SHA384,
	TLS_ECDH_RSA_WITH_CAMELLIA_128_GCM_SHA256,
	TLS_ECDH_RSA_WITH_CAMELLIA_256_GCM_SHA384,
	TLS_ECDHE_PSK_WITH_CAMELLIA_128_CBC_SHA256,
	TLS_ECDHE_PSK_WITH_CAMELLIA_256_CBC_SHA384,
	TLS_ECDHE_ECDSA_WITH_AES_128_CCM,
	TLS_ECDHE_ECDSA_WITH_AES_256_CCM,
	TLS_ECDHE_ECDSA_WITH_AES_128_CCM_8,
	TLS_ECDHE_ECDSA_WITH_AES_256_CCM_8,
	TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305_SHA256,
	TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305_SHA256
		-> ec_server_key_exchange : EcServerKeyExchange(rec);

	# DHE suites
	TLS_DHE_DSS_EXPORT_WITH_DES40_CBC_SHA,
	TLS_DHE_DSS_WITH_DES_CBC_SHA,
	TLS_DHE_DSS_WITH_3DES_EDE_CBC_SHA,
	TLS_DHE_RSA_EXPORT_WITH_DES40_CBC_SHA,
	TLS_DHE_RSA_WITH_DES_CBC_SHA,
	TLS_DHE_RSA_WITH_3DES_EDE_CBC_SHA,
	TLS_DHE_DSS_WITH_AES_128_CBC_SHA,
	TLS_DHE_RSA_WITH_AES_128_CBC_SHA,
	TLS_DHE_DSS_WITH_AES_256_CBC_SHA,
	TLS_DHE_RSA_WITH_AES_256_CBC_SHA,
	TLS_DHE_DSS_WITH_AES_128_CBC_SHA256,
	TLS_DHE_DSS_WITH_CAMELLIA_128_CBC_SHA,
	TLS_DHE_RSA_WITH_CAMELLIA_128_CBC_SHA,
	TLS_DHE_DSS_EXPORT1024_WITH_DES_CBC_SHA,
	TLS_DHE_DSS_EXPORT1024_WITH_RC4_56_SHA,
	TLS_DHE_DSS_WITH_RC4_128_SHA,
	TLS_DHE_RSA_WITH_AES_128_CBC_SHA256,
	TLS_DHE_DSS_WITH_AES_256_CBC_SHA256,
	TLS_DHE_RSA_WITH_AES_256_CBC_SHA256,
	TLS_DHE_DSS_WITH_3DES_EDE_CBC_RMD,
	TLS_DHE_DSS_WITH_AES_128_CBC_RMD,
	TLS_DHE_DSS_WITH_AES_256_CBC_RMD,
	TLS_DHE_RSA_WITH_3DES_EDE_CBC_RMD,
	TLS_DHE_RSA_WITH_AES_128_CBC_RMD,
	TLS_DHE_RSA_WITH_AES_256_CBC_RMD,
	TLS_DHE_DSS_WITH_CAMELLIA_256_CBC_SHA,
	TLS_DHE_RSA_WITH_CAMELLIA_256_CBC_SHA,
	TLS_DHE_PSK_WITH_RC4_128_SHA,
	TLS_DHE_PSK_WITH_3DES_EDE_CBC_SHA,
	TLS_DHE_PSK_WITH_AES_128_CBC_SHA,
	TLS_DHE_PSK_WITH_AES_256_CBC_SHA,
	TLS_DHE_DSS_WITH_SEED_CBC_SHA,
	TLS_DHE_RSA_WITH_SEED_CBC_SHA,
	TLS_DHE_RSA_WITH_AES_128_GCM_SHA256,
	TLS_DHE_RSA_WITH_AES_256_GCM_SHA384,
	TLS_DHE_DSS_WITH_AES_128_GCM_SHA256,
	TLS_DHE_DSS_WITH_AES_256_GCM_SHA384,
	TLS_DHE_PSK_WITH_AES_128_GCM_SHA256,
	TLS_DHE_PSK_WITH_AES_256_GCM_SHA384,
	TLS_DHE_PSK_WITH_AES_128_CBC_SHA256,
	TLS_DHE_PSK_WITH_AES_256_CBC_SHA384,
	TLS_DHE_PSK_WITH_NULL_SHA256,
	TLS_DHE_PSK_WITH_NULL_SHA384,
	TLS_DHE_DSS_WITH_CAMELLIA_128_CBC_SHA256,
	TLS_DHE_RSA_WITH_CAMELLIA_128_CBC_SHA256,
	TLS_DHE_DSS_WITH_CAMELLIA_256_CBC_SHA256,
	TLS_DHE_RSA_WITH_CAMELLIA_256_CBC_SHA256,
	TLS_DHE_DSS_WITH_ARIA_128_CBC_SHA256,
	TLS_DHE_DSS_WITH_ARIA_256_CBC_SHA384,
	TLS_DHE_RSA_WITH_ARIA_128_CBC_SHA256,
	TLS_DHE_RSA_WITH_ARIA_256_CBC_SHA384,
	TLS_DHE_RSA_WITH_ARIA_128_GCM_SHA256,
	TLS_DHE_RSA_WITH_ARIA_256_GCM_SHA384,
	TLS_DHE_DSS_WITH_ARIA_128_GCM_SHA256,
	TLS_DHE_DSS_WITH_ARIA_256_GCM_SHA384,
	TLS_DHE_PSK_WITH_ARIA_128_CBC_SHA256,
	TLS_DHE_PSK_WITH_ARIA_256_CBC_SHA384,
	TLS_DHE_PSK_WITH_ARIA_128_GCM_SHA256,
	TLS_DHE_PSK_WITH_ARIA_256_GCM_SHA384,
	TLS_DHE_RSA_WITH_CAMELLIA_128_GCM_SHA256,
	TLS_DHE_RSA_WITH_CAMELLIA_256_GCM_SHA384,
	TLS_DHE_DSS_WITH_CAMELLIA_128_GCM_SHA256,
	TLS_DHE_DSS_WITH_CAMELLIA_256_GCM_SHA384,
	TLS_DHE_PSK_WITH_CAMELLIA_128_GCM_SHA256,
	TLS_DHE_PSK_WITH_CAMELLIA_256_GCM_SHA384,
	TLS_DHE_PSK_WITH_CAMELLIA_128_CBC_SHA256,
	TLS_DHE_PSK_WITH_CAMELLIA_256_CBC_SHA384,
	TLS_DHE_RSA_WITH_AES_128_CCM,
	TLS_DHE_RSA_WITH_AES_256_CCM,
	TLS_DHE_RSA_WITH_AES_128_CCM_8,
	TLS_DHE_RSA_WITH_AES_256_CCM_8,
	TLS_DHE_PSK_WITH_AES_128_CCM,
	TLS_DHE_PSK_WITH_AES_256_CCM,
	TLS_PSK_DHE_WITH_AES_128_CCM_8,
	TLS_PSK_DHE_WITH_AES_256_CCM_8,
	TLS_DHE_RSA_WITH_CHACHA20_POLY1305_SHA256,
	# DH-anon suites
	TLS_DH_ANON_EXPORT_WITH_RC4_40_MD5,
	TLS_DH_ANON_WITH_RC4_128_MD5,
	TLS_DH_ANON_EXPORT_WITH_DES40_CBC_SHA,
	TLS_DH_ANON_WITH_DES_CBC_SHA,
	TLS_DH_ANON_WITH_3DES_EDE_CBC_SHA,
	TLS_DH_ANON_WITH_AES_128_CBC_SHA,
	TLS_DH_ANON_WITH_AES_256_CBC_SHA,
	TLS_DH_ANON_WITH_CAMELLIA_128_CBC_SHA,
	TLS_DH_ANON_WITH_AES_128_CBC_SHA256,
	TLS_DH_ANON_WITH_AES_256_CBC_SHA256,
	TLS_DH_ANON_WITH_CAMELLIA_256_CBC_SHA,
	TLS_DH_ANON_WITH_SEED_CBC_SHA,
	TLS_DH_ANON_WITH_AES_128_GCM_SHA256,
	TLS_DH_ANON_WITH_AES_256_GCM_SHA384,
	TLS_DH_ANON_WITH_CAMELLIA_128_CBC_SHA256,
	TLS_DH_ANON_WITH_CAMELLIA_256_CBC_SHA256,
	TLS_DH_ANON_WITH_ARIA_128_CBC_SHA256,
	TLS_DH_ANON_WITH_ARIA_256_CBC_SHA384,
	TLS_DH_ANON_WITH_ARIA_128_GCM_SHA256,
	TLS_DH_ANON_WITH_ARIA_256_GCM_SHA384,
	TLS_DH_ANON_WITH_CAMELLIA_128_GCM_SHA256,
	TLS_DH_ANON_WITH_CAMELLIA_256_GCM_SHA384
	# DH non-anon suites do not send a ServerKeyExchange
		-> dh_server_key_exchange : DhServerKeyExchange(rec);

	default
		-> key : bytestring &restofdata &transient;
};

# For the moment, we really only are interested in the curve name. If it
# is not set (if the server sends explicit parameters), we do not bother.
# We also do not parse the actual signature data following the named curve.
type EcServerKeyExchange(rec: Handshake) = record {
	curve_type: uint8;
	curve: uint16; # only if curve_type = 3 (NAMED_CURVE)
	data: bytestring &restofdata &transient;
};

# For both, dh_anon and dhe the ServerKeyExchange starts with a ServerDHParams
# structure. After that, they start to differ, but we do not care about that.
type DhServerKeyExchange(rec: Handshake) = record {
	dh_p_length: uint16;
	dh_p: bytestring &length=dh_p_length;
	dh_g_length: uint16;
	dh_g: bytestring &length=dh_g_length;
	dh_Ys_length: uint16;
	dh_Ys: bytestring &length=dh_Ys_length;
	data: bytestring &restofdata &transient;
};


######################################################################
# V3 Certificate Request (7.4.4.)
######################################################################

# For now, ignore Certificate Request Details; just eat up message.
type CertificateRequest(rec: Handshake) = record {
	cont : bytestring &restofdata &transient;
};


######################################################################
# V3 Server Hello Done (7.4.5.)
######################################################################

# Server Hello Done is empty
type ServerHelloDone(rec: Handshake) = empty;


######################################################################
# V3 Client Certificate (7.4.6.)
######################################################################

# Client Certificate is identical to Server Certificate;
# no further definition here


######################################################################
# V3 Client Key Exchange Message (7.4.7.)
######################################################################

# For now ignore details of ClientKeyExchange (most of it is
# encrypted anyway); just eat up message.
type ClientKeyExchange(rec: Handshake) = record {
	key : bytestring &restofdata &transient;
};


######################################################################
# V3 Certificate Verify (7.4.8.)
######################################################################

# For now, ignore Certificate Verify; just eat up the message.
type CertificateVerify(rec: Handshake) = record {
	cont : bytestring &restofdata &transient;
};


######################################################################
# V3 Finished (7.4.9.)
######################################################################

# The finished messages are always sent after encryption is in effect,
# so we will not be able to read those messages.
type Finished(rec: Handshake) = record {
	cont : bytestring &restofdata &transient;
};

type SessionTicketHandshake(rec: Handshake) = record {
	ticket_lifetime_hint: uint32;
	data:                 bytestring &restofdata;
};

######################################################################
# TLS Extensions
######################################################################

type SSLExtension(rec: Handshake) = record {
	type: uint16;
	data_len: uint16;

	# Pretty code ahead. Deal with the fact that perhaps extensions are
	# not really present and we do not want to fail because of that.
	ext: case type of {
		EXT_APPLICATION_LAYER_PROTOCOL_NEGOTIATION -> apnl: ApplicationLayerProtocolNegotiationExtension(rec)[] &until($element == 0 || $element != 0);
		EXT_ELLIPTIC_CURVES -> elliptic_curves: EllipticCurves(rec)[] &until($element == 0 || $element != 0);
		EXT_EC_POINT_FORMATS -> ec_point_formats: EcPointFormats(rec)[] &until($element == 0 || $element != 0);
#		EXT_STATUS_REQUEST -> status_request: StatusRequest(rec)[] &until($element == 0 || $element != 0);
		EXT_SERVER_NAME -> server_name: ServerNameExt(rec)[] &until($element == 0 || $element != 0);
		default -> data: bytestring &restofdata;
	};
} &length=data_len+4 &exportsourcedata;

type ServerNameHostName() = record {
	length: uint16;
	host_name: bytestring &length=length;
};

type ServerName() = record {
	name_type: uint8; # has to be 0 for host-name
	name: case name_type of {
		0 -> host_name: ServerNameHostName;
		default -> data : bytestring &restofdata &transient; # unknown name
	};
};

type ServerNameExt(rec: Handshake) = record {
	length: uint16;
	server_names: ServerName[] &until($input.length() == 0);
} &length=length+2;

# Do not parse for now. Structure is correct, but only contains asn.1 data that we would not use further.
#type OcspStatusRequest(rec: Handshake) = record {
#	responder_id_list_length: uint16;
#	responder_id_list: bytestring &length=responder_id_list_length;
#	request_extensions_length: uint16;
#	request_extensions: bytestring &length=request_extensions_length;
#};
#
#type StatusRequest(rec: Handshake) = record {
#	status_type: uint8; # 1 -> ocsp
#	req: case status_type of {
#		1 -> ocsp_status_request: OcspStatusRequest(rec);
#		default -> data : bytestring &restofdata &transient; # unknown
#	};
#};

type EcPointFormats(rec: Handshake) = record {
	length: uint8;
	point_format_list: uint8[length];
};

type EllipticCurves(rec: Handshake) = record {
	length: uint16;
	elliptic_curve_list: uint16[length/2];
};

type ProtocolName() = record {
  length: uint8;
	name: bytestring &length=length;
};

type ApplicationLayerProtocolNegotiationExtension(rec: Handshake) = record {
	length: uint16;
	protocol_name_list: ProtocolName[] &until($input.length() == 0);
} &length=length+2;

refine connection Handshake_Conn += {

	%member{
		uint32 chosen_cipher_;
		uint8 msg_type_;
		uint32 msg_length_;
	%}

	%init{
		chosen_cipher_ = NO_CHOSEN_CIPHER;
		msg_type_ = 0;
		msg_length_ = 0;
	%}

	function chosen_cipher() : int %{ return chosen_cipher_; %}

	function msg_type() : uint8 %{ return msg_type_; %}

	function msg_length() : uint32 %{ return msg_length_; %}

	function set_msg_type(type: uint8) : bool
		%{
		msg_type_ = type;
		return true;
		%}

	function set_msg_length(len: uint32) : bool
		%{
		msg_length_ = len;
		return true;
		%}

	function set_cipher(cipher: uint32) : bool
		%{
		chosen_cipher_ = cipher;
		return true;
		%}
};


