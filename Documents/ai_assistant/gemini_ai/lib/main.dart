import 'dart:io';
import 'package:flutter/material.dart';
import 'package:google_generative_ai/google_generative_ai.dart';
import 'package:image_picker/image_picker.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_markdown_plus/flutter_markdown_plus.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:speech_to_text/speech_to_text.dart';
import 'package:flutter_tts/flutter_tts.dart';
import 'package:permission_handler/permission_handler.dart';
import 'l10n/app_localizations.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await dotenv.load(fileName: ".env");
  runApp(const MyApp());
}

class MyApp extends StatefulWidget {
  const MyApp({super.key});

  static void setLocale(BuildContext context, Locale newLocale) {
    final state = context.findAncestorStateOfType<_MyAppState>();
    state?.setLocale(newLocale);
  }

  @override
  State<MyApp> createState() => _MyAppState();
}

class _MyAppState extends State<MyApp> {
  Locale _locale = const Locale('tr');

  void setLocale(Locale locale) {
    setState(() {
      _locale = locale;
    });
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      locale: _locale,
      localizationsDelegates: const [
        AppLocalizations.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      supportedLocales: const [Locale('en'), Locale('tr')],
      debugShowCheckedModeBanner: false,
      theme: ThemeData.dark().copyWith(scaffoldBackgroundColor: Colors.black),
      home: const ChatScreen(),
    );
  }
}

class Message {
  final String text;
  final File? image;
  final bool isUser;
  Message({required this.text, this.image, required this.isUser});
}

class ChatScreen extends StatefulWidget {
  const ChatScreen({super.key});
  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final TextEditingController _controller = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final List<Message> _messages = [];
  final ImagePicker _picker = ImagePicker();
  bool _isLoading = false;
  late final GenerativeModel _model;
  late final ChatSession _chat;

  // Ses özellikleri - DÜZELTİLDİ
  late SpeechToText _speechToText;
  late FlutterTts _flutterTts;
  bool _speechEnabled = false;
  bool _isListening = false;

  @override
  void initState() {
    super.initState();

    // Gemini API
    final apiKey = dotenv.env['GEMINI_API_KEY'];
    if (apiKey == null || apiKey.isEmpty) {
      throw Exception("Gemini API key not found in .env");
    }
    _model = GenerativeModel(model: 'gemini-2.5-flash', apiKey: apiKey);
    _chat = _model.startChat();

    // Ses sistemleri - DÜZELTİLDİ
    _speechToText = SpeechToText();
    _flutterTts = FlutterTts();
    _initSpeech();

    // Hoş geldin mesajı
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final loc = AppLocalizations.of(context)!;
      _messages.add(Message(text: loc.welcomeMessage, isUser: false));
      _speak(loc.welcomeMessage);
      setState(() {});
      _scrollToBottom();
    });
  }

  void _initSpeech() async {
    _speechEnabled = await _speechToText.initialize();
    if (mounted) setState(() {});
  }

  Future<void> _startListening() async {
    final status = await Permission.microphone.request();
    if (status != PermissionStatus.granted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            Localizations.localeOf(context).languageCode == 'tr'
                ? "Mikrofon izni verilmedi. Ayarlardan açın."
                : "Microphone permission denied.",
          ),
        ),
      );
      return;
    }

    if (!_isListening && _speechEnabled) {
      await _speechToText.listen(
        onResult: (result) {
          setState(() {
            _controller.text = result.recognizedWords;
          });
        },
        localeId: Localizations.localeOf(context).languageCode == 'tr'
            ? 'tr_TR'
            : 'en_US',
      );
      setState(() => _isListening = true);
    }
  }

  Future<void> _stopListening() async {
    await _speechToText.stop();
    setState(() => _isListening = false);
  }

  Future<void> _speak(String text) async {
    await _flutterTts.setLanguage(
      Localizations.localeOf(context).languageCode == 'tr' ? 'tr-TR' : 'en-US',
    );
    await _flutterTts.setSpeechRate(0.5);
    await _flutterTts.speak(text);
  }

  Future<void> _sendMessage({String? text, File? image}) async {
    final loc = AppLocalizations.of(context)!;
    final messageText = text?.trim() ?? _controller.text.trim();
    if (messageText.isEmpty && image == null) return;

    _controller.clear();
    _stopListening();

    setState(() {
      _messages.add(Message(text: messageText, image: image, isUser: true));
      _isLoading = true;
    });
    _scrollToBottom();

    try {
      final content = image != null
          ? Content.multi([
              TextPart(
                messageText.isEmpty ? loc.imagePromptGallery : messageText,
              ),
              DataPart('image/jpeg', await image.readAsBytes()),
            ])
          : Content.text(messageText);

      final response = await _chat.sendMessage(content);
      final responseText =
          response.text ??
          (Localizations.localeOf(context).languageCode == 'tr'
              ? "Cevap alınamadı."
              : "No response received.");

      setState(() {
        _messages.add(Message(text: responseText, isUser: false));
        _isLoading = false;
      });
      _scrollToBottom();

      _speak(responseText); // Sesli cevap
    } catch (e) {
      final errorMessage = Localizations.localeOf(context).languageCode == 'tr'
          ? 'Hata: $e'
          : 'Error: $e';

      setState(() {
        _messages.add(Message(text: errorMessage, isUser: false));
        _isLoading = false;
      });
      _scrollToBottom();
    }
  }

  Future<void> _pickImage() async {
    final picked = await _picker.pickImage(
      source: ImageSource.gallery,
      imageQuality: 85,
    );
    if (picked != null) {
      final imageFile = File(picked.path);
      setState(
        () => _messages.add(Message(text: '', image: imageFile, isUser: true)),
      );
      _scrollToBottom();
      await _sendMessage(
        text: AppLocalizations.of(context)!.imagePromptGallery,
        image: imageFile,
      );
    }
  }

  Future<void> _takePhoto() async {
    final picked = await _picker.pickImage(
      source: ImageSource.camera,
      imageQuality: 85,
    );
    if (picked != null) {
      final imageFile = File(picked.path);
      setState(
        () => _messages.add(Message(text: '', image: imageFile, isUser: true)),
      );
      _scrollToBottom();
      await _sendMessage(
        text: AppLocalizations.of(context)!.imagePromptCamera,
        image: imageFile,
      );
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Widget _buildMessage(Message msg) {
    final isUser = msg.isUser;
    return Align(
      alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        constraints: BoxConstraints(
          maxWidth: MediaQuery.of(context).size.width * 0.8,
        ),
        margin: const EdgeInsets.symmetric(vertical: 8, horizontal: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isUser ? Colors.blue[700] : Colors.grey[850],
          borderRadius: BorderRadius.circular(24),
          boxShadow: const [
            BoxShadow(
              color: Colors.black26,
              blurRadius: 8,
              offset: Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (msg.image != null)
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(16),
                  child: Image.file(
                    msg.image!,
                    width: 240,
                    height: 240,
                    fit: BoxFit.cover,
                  ),
                ),
              ),
            if (msg.text.isNotEmpty)
              MarkdownBody(
                data: msg.text,
                selectable: true,
                styleSheet: MarkdownStyleSheet.fromTheme(Theme.of(context))
                    .copyWith(
                      p: const TextStyle(color: Colors.white, fontSize: 16),
                      code: const TextStyle(backgroundColor: Color(0xFF2A2A2A)),
                      codeblockDecoration: BoxDecoration(
                        color: const Color(0xFF2A2A2A),
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
              ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final loc = AppLocalizations.of(context)!;

    return Scaffold(
      appBar: AppBar(
        title: Text(loc.geminiTitle),
        centerTitle: true,
        backgroundColor: Colors.black,
        actions: [
          PopupMenuButton<Locale>(
            icon: const Icon(Icons.language, color: Colors.white),
            onSelected: (locale) => MyApp.setLocale(context, locale),
            itemBuilder: (context) => const [
              PopupMenuItem(value: Locale('tr'), child: Text('Türkçe')),
              PopupMenuItem(value: Locale('en'), child: Text('English')),
            ],
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView.builder(
              controller: _scrollController,
              padding: const EdgeInsets.only(top: 16),
              itemCount: _messages.length + (_isLoading ? 1 : 0),
              itemBuilder: (context, i) {
                if (i == _messages.length && _isLoading) {
                  return Align(
                    alignment: Alignment.centerLeft,
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Row(
                        children: [
                          const SizedBox(
                            width: 24,
                            height: 24,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          ),
                          const SizedBox(width: 12),
                          Text(
                            loc.thinking,
                            style: const TextStyle(color: Colors.grey),
                          ),
                        ],
                      ),
                    ),
                  );
                }
                return _buildMessage(_messages[i]);
              },
            ),
          ),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.grey[900],
              border: Border(top: BorderSide(color: Colors.grey[800]!)),
            ),
            child: Row(
              children: [
                IconButton(
                  onPressed: _pickImage,
                  icon: const Icon(Icons.photo_library, color: Colors.white),
                ),
                IconButton(
                  onPressed: _takePhoto,
                  icon: const Icon(Icons.camera_alt, color: Colors.white),
                ),
                IconButton(
                  onPressed: _isListening ? _stopListening : _startListening,
                  icon: AnimatedSwitcher(
                    duration: const Duration(milliseconds: 200),
                    child: Icon(
                      _isListening ? Icons.mic : Icons.mic_none,
                      key: ValueKey(_isListening),
                      color: _isListening ? Colors.redAccent : Colors.white,
                      size: 28,
                    ),
                  ),
                ),
                Expanded(
                  child: TextField(
                    controller: _controller,
                    style: const TextStyle(color: Colors.white),
                    decoration: InputDecoration(
                      hintText: loc.hintText,
                      hintStyle: TextStyle(color: Colors.grey[500]),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(30),
                        borderSide: BorderSide.none,
                      ),
                      filled: true,
                      fillColor: Colors.grey[800],
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 20,
                        vertical: 12,
                      ),
                    ),
                    onSubmitted: (_) => _sendMessage(),
                  ),
                ),
                const SizedBox(width: 8),
                IconButton(
                  onPressed: _isLoading ? null : () => _sendMessage(),
                  icon: Icon(
                    Icons.send,
                    color: _isLoading ? Colors.grey : Colors.blue,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    _flutterTts.stop();
    _speechToText.stop();
    super.dispose();
  }
}
