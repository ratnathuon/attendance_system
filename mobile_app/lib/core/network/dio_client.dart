import 'package:dio/dio.dart';
import '../constants/api_endpoints.dart';
import 'api_interceptor.dart';

class DioClient {
  static Dio? _dio;

  static Dio get instance {
    if (_dio != null) return _dio!;

    final dio = Dio(
      BaseOptions(
        baseUrl: ApiEndpoints.baseUrl,
        connectTimeout: const Duration(seconds: 15),
        receiveTimeout: const Duration(seconds: 15),
        sendTimeout: const Duration(seconds: 15),
      ),
    );

    dio.interceptors.add(ApiInterceptor());
    _dio = dio;
    return dio;
  }
}
