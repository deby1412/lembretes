import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, Text, View, TextInput, TouchableOpacity, 
  Alert, ScrollView, SafeAreaView, StatusBar, Platform 
} from 'react-native';
import * as Notifications from 'expo-notifications';


Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function App() {
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [horario, setHorario] = useState('08:00');
  const [recorrencia, setRecorrencia] = useState('Única'); 
  const [listaLembretes, setListaLembretes] = useState([]);

  const responseListener = useRef();

  useEffect(() => {
    pedirPermissoes();

    
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const actionId = response.actionIdentifier;
      const data = response.notification.request.content.data;

      if (actionId === 'CONCLUIR_ACTION') {
        Alert.alert('Ação', 'Lembrete concluído!');
        removerLembretePorId(data.notificationId);
      } else if (actionId === 'ADIAR_ACTION') {
        Alert.alert('Ação', 'Lembrete adiado por 10 minutos!');
      }
    });

    return () => {
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [listaLembretes]);

  async function pedirPermissoes() {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Ative as notificações para receber os lembretes.');
    }

    
    await Notifications.setNotificationCategoryAsync('lembrete-actions', [
      {
        identifier: 'CONCLUIR_ACTION',
        buttonTitle: 'Concluir',
        options: { opensAppToForeground: false },
      },
      {
        identifier: 'ADIAR_ACTION',
        buttonTitle: 'Adiar 10 min',
        options: { opensAppToForeground: false },
      },
    ]);
  }

  
  async function criarLembrete() {
    if (!titulo.trim() || !descricao.trim()) {
      Alert.alert('Campos vazios', 'Por favor, preencha o título e a descrição.');
      return;
    }

    try {
      
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: `Lembrete: ${titulo}`,
          body: descricao,
          data: { recorrencia },
          categoryIdentifier: 'lembrete-actions',
          sound: true,
        },
        trigger: {
          seconds: 5, 
        },
      });
      
      const novoLembrete = {
        id: notificationId,
        titulo,
        descricao,
        horario,
        recorrencia,
      };

      setListaLembretes([...listaLembretes, novoLembrete]);
      setTitulo('');
      setDescricao('');
      Alert.alert('Sucesso!', 'Seu lembrete foi agendado.');
    } catch (error) {
      console.log(error);
      Alert.alert('Erro', 'Não foi possível agendar a notificação.');
    }
  }

  function removerLembretePorId(id) {
    setListaLembretes(prev => prev.filter(item => item.id !== id));
  }

  async function concluirLembrete(id) {
    await Notifications.cancelScheduledNotificationAsync(id);
    removerLembretePorId(id);
    Alert.alert('Feito!', 'Lembrete concluído e removido.');
  }

  async function adiarLembrete(item) {
    await Notifications.cancelScheduledNotificationAsync(item.id);

    const novoId = await Notifications.scheduleNotificationAsync({
      content: {
        title: `[Adiado] ${item.titulo}`,
        body: item.descricao,
        data: { recorrencia: item.recorrencia },
        categoryIdentifier: 'lembrete-actions',
        sound: true,
      },
      trigger: {
        seconds: 600, 
      },
    });

    const atualizados = listaLembretes.map(l => l.id === item.id ? { ...l, id: novoId } : l);
    setListaLembretes(atualizados);
    Alert.alert('Adiado', 'O lembrete foi adiado por 10 minutos.');
  }

  async function cancelarTodos() {
    await Notifications.cancelAllScheduledNotificationsAsync();
    setListaLembretes([]);
    Alert.alert('Cancelados', 'Todas as notificações foram apagadas.');
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#121214" />
      
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}> Meus Lembretes</Text>
        <Text style={styles.headerSubtitle}>Agenda</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Novo Lembrete</Text>

          <TextInput
            style={styles.input}
            placeholder="Título (ex: Beber água)"
            placeholderTextColor="#7c7c8a"
            value={titulo}
            onChangeText={setTitulo}
          />

          <TextInput
            style={styles.input}
            placeholder="Descrição (ex: Copo de 300ml)"
            placeholderTextColor="#7c7c8a"
            value={descricao}
            onChangeText={setDescricao}
          />

          <TextInput
            style={styles.input}
            placeholder="Horário (ex: 08:00)"
            placeholderTextColor="#7c7c8a"
            value={horario}
            onChangeText={setHorario}
          />

          <Text style={styles.labelRecorrencia}>Repetição:</Text>
          <View style={styles.recorrenciaContainer}>
            <TouchableOpacity 
              style={[styles.botaoRecorrencia, recorrencia === 'Única' && styles.botaoRecorrenciaAtivo]}
              onPress={() => setRecorrencia('Única')}
            >
              <Text style={[styles.textoRecorrencia, recorrencia === 'Única' && styles.textoRecorrenciaAtivo]}>Única</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.botaoRecorrencia, recorrencia === 'Diária' && styles.botaoRecorrenciaAtivo]}
              onPress={() => setRecorrencia('Diária')}
            >
              <Text style={[styles.textoRecorrencia, recorrencia === 'Diária' && styles.textoRecorrenciaAtivo]}>Diária</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.botaoAgendar} onPress={criarLembrete}>
            <Text style={styles.textoBotaoAgendar}>Agendar Lembrete</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.listHeaderRow}>
          <Text style={styles.subHeader}>Agendados ({listaLembretes.length})</Text>
          {listaLembretes.length > 0 && (
            <TouchableOpacity onPress={cancelarTodos}>
              <Text style={styles.textCancelarTodos}>Cancelar Todos</Text>
            </TouchableOpacity>
          )}
        </View>

        {listaLembretes.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Nenhum lembrete cadastrado ainda.</Text>
          </View>
        ) : (
          listaLembretes.map((item) => (
            <View key={item.id} style={styles.card}>
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>{item.titulo}</Text>
                <Text style={styles.cardDesc}>{item.descricao}</Text>
                <Text style={styles.cardDetails}>🕒 {item.horario}  |  🔄 {item.recorrencia}</Text>
              </View>

              <View style={styles.cardActions}>
                <TouchableOpacity style={styles.btnConcluir} onPress={() => concluirLembrete(item.id)}>
                  <Text style={styles.btnActionText}>Concluir</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.btnAdiar} onPress={() => adiarLembrete(item)}>
                  <Text style={styles.btnActionText}>Adiar 10m</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121214' },
  headerContainer: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 15, backgroundColor: '#202024', borderBottomWidth: 1, borderBottomColor: '#323238' },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#e1e1e6' },
  headerSubtitle: { fontSize: 13, color: '#8257e5', marginTop: 2 },
  scrollContent: { padding: 20 },
  formCard: { backgroundColor: '#202024', borderRadius: 12, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#323238' },
  formTitle: { fontSize: 18, fontWeight: 'bold', color: '#e1e1e6', marginBottom: 12 },
  input: { backgroundColor: '#121214', borderWidth: 1, borderColor: '#323238', color: '#e1e1e6', padding: 12, borderRadius: 8, marginBottom: 12, fontSize: 15 },
  labelRecorrencia: { color: '#c4c4cc', fontSize: 14, marginBottom: 6 },
  recorrenciaContainer: { flexDirection: 'row', marginBottom: 16, gap: 10 },
  botaoRecorrencia: { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#323238', alignItems: 'center', backgroundColor: '#121214' },
  botaoRecorrenciaAtivo: { backgroundColor: '#8257e5', borderColor: '#8257e5' },
  textoRecorrencia: { color: '#7c7c8a', fontWeight: 'bold' },
  textoRecorrenciaAtivo: { color: '#fff' },
  botaoAgendar: { backgroundColor: '#00875f', padding: 14, borderRadius: 8, alignItems: 'center' },
  textoBotaoAgendar: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  listHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  subHeader: { fontSize: 16, fontWeight: 'bold', color: '#e1e1e6' },
  textCancelarTodos: { color: '#f75a68', fontSize: 14, fontWeight: 'bold' },
  emptyContainer: { padding: 30, alignItems: 'center' },
  emptyText: { color: '#7c7c8a', fontStyle: 'italic' },
  card: { backgroundColor: '#202024', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#323238' },
  cardInfo: { marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#00b37e', marginBottom: 4 },
  cardDesc: { fontSize: 14, color: '#c4c4cc', marginBottom: 6 },
  cardDetails: { fontSize: 12, color: '#7c7c8a' },
  cardActions: { flexDirection: 'row', gap: 10, borderTopWidth: 1, borderTopColor: '#323238', paddingTop: 12 },
  btnConcluir: { flex: 1, backgroundColor: '#00b37e', paddingVertical: 8, borderRadius: 6, alignItems: 'center' },
  btnAdiar: { flex: 1, backgroundColor: '#fba94c', paddingVertical: 8, borderRadius: 6, alignItems: 'center' },
  btnActionText: { color: '#121214', fontWeight: 'bold', fontSize: 13 },
});