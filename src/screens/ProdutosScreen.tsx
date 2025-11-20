import { Ionicons } from '@expo/vector-icons';
import { onValue, push, ref, remove, set, update } from "firebase/database";
import React, { memo, useEffect, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  FlatList,
  ImageBackground,
  KeyboardAvoidingView,
  ListRenderItem,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
// Importa o tipo Produto (antigo Peixe)
import { Produto } from "../../app/(tabs)";
import { auth, database } from "../services/connectionFirebase";

const { width } = Dimensions.get('window');
const ADMIN_PASSWORD = 'admin123';

// Tipos de Categoria e Gênero do Tênis para facilitar a seleção
type CategoriaType = 'esportivo' | 'casual' | 'skate' | 'corrida' | 'outro' | '';
type GeneroType = 'masculino' | 'feminino' | 'unissex' | '';

// Mapeamento de categorias para exibição e seleção
const CATEGORIAS: { value: CategoriaType, label: string, icon: any }[] = [
  { value: 'casual', label: 'Casual', icon: 'shirt-outline' },
  { value: 'esportivo', label: 'Esportivo', icon: 'american-football-outline' },
  { value: 'corrida', label: 'Corrida', icon: 'walk-outline' },
  { value: 'skate', label: 'Skate', icon: 'cube-outline' },
  { value: 'outro', label: 'Outro', icon: 'help-circle-outline' },
];

const GENEROS: { value: GeneroType, label: string, icon: any }[] = [
  { value: 'masculino', label: 'Masculino', icon: 'male-outline' },
  { value: 'feminino', label: 'Feminino', icon: 'female-outline' },
  { value: 'unissex', label: 'Unissex', icon: 'people-outline' },
];

type FormState = {
  nomeModelo: string;
  marca: string;
  precoBase: string;
  categoria: CategoriaType;
  genero: GeneroType;
  observacoes: string;
};

type ProdutoFormProps = {
  formState: FormState;
  onFormChange: (field: keyof FormState, value: string) => void;
  onSelectCategoria: () => void;
  onSelectGenero: () => void;
};

// ==================== COMPONENTE DO FORMULÁRIO ====================
const ProdutoForm = memo(({ 
  formState, 
  onFormChange,
  onSelectCategoria,
  onSelectGenero
}: ProdutoFormProps) => {
  
  const getIconForCategory = (cat: CategoriaType) => {
    return CATEGORIAS.find(c => c.value === cat)?.icon || 'help-circle-outline';
  };

  const selectedCategoryLabel = CATEGORIAS.find(c => c.value === formState.categoria)?.label || "Selecione a categoria";
  const selectedGeneroLabel = GENEROS.find(g => g.value === formState.genero)?.label || "Selecione o gênero";

  return (
    <View style={styles.formContainer}>
      <View style={styles.inputWrapper}>
        <Text style={styles.inputLabel}>Nome do Modelo *</Text>
        <View style={styles.inputWithIcon}>
          <Ionicons name="shoe-
          " size={20} color="#0EA5E9" style={styles.inputIcon} />
          <TextInput 
            style={styles.input} 
            placeholder="Ex: Air Max 90" 
            value={formState.nomeModelo} 
            onChangeText={v => onFormChange('nomeModelo', v)}
            placeholderTextColor="#94A3B8"
          />
        </View>
      </View>
      
      <View style={styles.inputWrapper}>
        <Text style={styles.inputLabel}>Marca *</Text>
        <View style={styles.inputWithIcon}>
          <Ionicons name="bookmark-outline" size={20} color="#0EA5E9" style={styles.inputIcon} />
          <TextInput 
            style={styles.input} 
            placeholder="Ex: Nike, Adidas" 
            value={formState.marca} 
            onChangeText={v => onFormChange('marca', v)}
            placeholderTextColor="#94A3B8"
          />
        </View>
      </View>
      
      <View style={styles.inputWrapper}>
        <Text style={styles.inputLabel}>Preço Base (R$) *</Text>
        <View style={styles.inputWithIcon}>
          <Ionicons name="cash-outline" size={20} color="#0EA5E9" style={styles.inputIcon} />
          <TextInput 
            style={styles.input} 
            placeholder="0.00" 
            value={formState.precoBase} 
            onChangeText={v => onFormChange('precoBase', v)}
            placeholderTextColor="#94A3B8"
            keyboardType="numeric"
          />
        </View>
      </View>

      <View style={styles.conditionsRow}>
        <View style={[styles.inputWrapper, { flex: 1 }]}>
          <Text style={styles.inputLabel}>Categoria *</Text>
          <Pressable style={styles.selectButton} onPress={onSelectCategoria}>
            <Ionicons name={getIconForCategory(formState.categoria)} size={20} color="#64748B" />
            <Text style={[styles.selectButtonText, formState.categoria === '' && styles.placeholderText]}>
              {selectedCategoryLabel}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#64748B" />
          </Pressable>
        </View>
        
        <View style={[styles.inputWrapper, { flex: 1 }]}>
          <Text style={styles.inputLabel}>Gênero *</Text>
          <Pressable style={styles.selectButton} onPress={onSelectGenero}>
            <Ionicons name={GENEROS.find(g => g.value === formState.genero)?.icon || 'person-outline'} size={20} color="#64748B" />
            <Text style={[styles.selectButtonText, formState.genero === '' && styles.placeholderText]}>
              {selectedGeneroLabel}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#64748B" />
          </Pressable>
        </View>
      </View>

      <View style={styles.inputWrapper}>
        <Text style={styles.inputLabel}>Observações</Text>
        <View style={styles.inputWithIcon}>
          <Ionicons name="document-text-outline" size={20} color="#0EA5E9" style={styles.inputIcon} />
          <TextInput 
            style={[styles.input, styles.textArea]} 
            placeholder="Informações adicionais sobre o tênis (materiais, cores, etc.)..." 
            value={formState.observacoes} 
            onChangeText={v => onFormChange('observacoes', v)}
            placeholderTextColor="#94A3B8"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>
      </View>
    </View>
  );
});

// ==================== COMPONENTE CARD DE PRODUTO ====================
const ProdutoCard = ({ item, onEdit, onDelete }: { item: Produto; onEdit: (produto: Produto) => void; onDelete: (produto: Produto) => void; }) => {
  
  const getCategoryColor = (categoria: CategoriaType) => {
    switch (categoria) {
      case 'esportivo': return '#10B981';
      case 'casual': return '#0EA5E9';
      case 'corrida': return '#F59E0B';
      case 'skate': return '#8B5CF6';
      default: return '#64748B';
    }
  };

  return (
    <View style={styles.peixeCard}>
      <View style={styles.cardHeader}>
        <View style={[styles.cardIcon, {backgroundColor: getCategoryColor(item.categoria) + '20'}]}>
          <Ionicons name="shoe-
          " size={28} color={getCategoryColor(item.categoria)} />
        </View>
        <View style={styles.cardTitleContainer}>
          <Text style={styles.cardTitle}>{item.nomeModelo}</Text>
          <Text style={styles.cardSubtitle}>
            {item.marca} • {item.genero.charAt(0).toUpperCase() + item.genero.slice(1)}
          </Text>
        </View>
      </View>
      
      <View style={styles.cardDivider} />
      
      <View style={styles.cardDetails}>
        <View style={styles.detailRow}>
            <Ionicons name="pricetag-outline" size={16} color="#64748B" />
            <Text style={styles.detailLabel}>Preço Base:</Text>
            <Text style={styles.detailValue}>R$ {item.precoBase.toFixed(2).replace('.', ',')}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Ionicons name="bookmark-outline" size={16} color="#64748B" />
          <Text style={styles.detailLabel}>Categoria:</Text>
          <Text style={[styles.detailValue, {color: getCategoryColor(item.categoria), fontWeight: '700'}]}>
            {CATEGORIAS.find(c => c.value === item.categoria)?.label || 'Não Definida'}
          </Text>
        </View>
        
        {item.observacoes ? (
          <View style={styles.observacoesContainer}>
            <Text style={styles.observacoesLabel}>Observações</Text>
            <Text style={styles.observacoesText}>{item.observacoes}</Text>
          </View>
        ) : null}
      </View>
      
      <View style={styles.cardActions}>
        <Pressable 
          style={({ pressed }) => [styles.editButton, pressed && styles.pressed]} 
          onPress={() => onEdit(item)}
        >
          <Ionicons name="create-outline" size={18} color="#fff" />
          <Text style={styles.actionButtonText}>Editar</Text>
        </Pressable>
        
        <Pressable 
          style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]} 
          onPress={() => onDelete(item)}
        >
          <Ionicons name="trash-outline" size={18} color="#fff" />
          <Text style={styles.actionButtonText}>Excluir</Text>
        </Pressable>
      </View>
    </View>
  );
};


// ==================== TELA PRINCIPAL DE PRODUTOS ====================
export default function ProdutosScreen() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const user = auth.currentUser;
  const [fadeAnim] = useState(new Animated.Value(0));

  const [isAddOrEditModalVisible, setIsAddOrEditModalVisible] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [isCategoriaModalVisible, setIsCategoriaModalVisible] = useState(false);
  const [isGeneroModalVisible, setIsGeneroModalVisible] = useState(false);
  
  const [currentProduto, setCurrentProduto] = useState<Produto | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [formState, setFormState] = useState<FormState>({
    nomeModelo: '', marca: '', precoBase: '',
    categoria: CATEGORIAS[0].value, // Valor padrão
    genero: GENEROS[0].value, // Valor padrão
    observacoes: '',
  });

  // Efeito de Busca de Dados no Firebase (Caminho: /users/{uid}/peixes -> /users/{uid}/produtos)
  useEffect(() => {
    if (!user) return;
    // Alterando o caminho do Firebase para refletir o novo conceito 'produtos'
    const produtosRef = ref(database, `users/${user.uid}/produtos`); 
    const unsubscribe = onValue(produtosRef, (snapshot) => {
      const data = snapshot.val();
      // O tipo 'Produto' é usado
      setProdutos(data ? Object.keys(data).map(k => ({ id: k, ...data[k] })) : []);
      
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();
    });
    return unsubscribe;
  }, [user, fadeAnim]);

  const openAddModal = () => {
    setCurrentProduto(null);
    setFormState({
      nomeModelo: '', marca: '', precoBase: '',
      categoria: CATEGORIAS[0].value, 
      genero: GENEROS[0].value, 
      observacoes: '',
    });
    setIsAddOrEditModalVisible(true);
  };
  
  const openEditModal = (produto: Produto) => {
    setCurrentProduto(produto);
    setFormState({
      nomeModelo: produto.nomeModelo,
      marca: produto.marca,
      precoBase: produto.precoBase.toString(),
      categoria: produto.categoria,
      genero: produto.genero,
      observacoes: produto.observacoes || '',
    });
    setIsAddOrEditModalVisible(true);
  };
  
  const openDeleteModal = (produto: Produto) => {
    setCurrentProduto(produto);
    setIsDeleteModalVisible(true);
  };

  // A tipagem é necessária aqui, pois os valores de `categoria` e `genero` são strings válidas
  const handleFormChange = (field: keyof FormState, value: string) => {
    setFormState(prev => ({ ...prev, [field]: value as any }));
  };
  
  const handleAddOrUpdateProduto = async () => {
    if (!formState.nomeModelo.trim() || !formState.marca.trim() || !formState.precoBase.trim()) {
      return Alert.alert("Atenção", "O Modelo, Marca e Preço são obrigatórios.");
    }
    if (!user) return;

    // Converte vírgula para ponto e depois para float
    const precoBaseNum = parseFloat(formState.precoBase.replace(',', '.'));

    if (isNaN(precoBaseNum) || precoBaseNum <= 0) {
        return Alert.alert("Erro", "Preço base deve ser um número positivo válido.");
    }

    const produtoData: Produto = {
        // Garantindo que todos os campos do tipo Produto sejam preenchidos
        id: currentProduto?.id || '', 
        nomeModelo: formState.nomeModelo,
        marca: formState.marca,
        precoBase: precoBaseNum,
        categoria: formState.categoria as CategoriaType,
        genero: formState.genero as GeneroType,
        dataLancamento: currentProduto?.dataLancamento,
        imagemURL: currentProduto?.imagemURL,
        observacoes: formState.observacoes || '',
    }

    try {
      if (currentProduto) {
        // Usa o caminho 'produtos'
        await update(ref(database, `users/${user.uid}/produtos/${currentProduto.id}`), produtoData);
        Alert.alert("Sucesso", "Produto atualizado!");
      } else {
        // Usa o caminho 'produtos'
        await set(push(ref(database, `users/${user.uid}/produtos`)), {
            ...produtoData,
            id: undefined, // remove o ID temporário antes de enviar ao Firebase
            createdAt: new Date().toISOString()
        });
        Alert.alert("Sucesso", "Produto adicionado ao catálogo!");
      }
      setIsAddOrEditModalVisible(false);
    } catch (error) { 
      Alert.alert("Erro", "Não foi possível salvar o produto."); 
    }
  };

  const handleDeleteProduto = async () => {
    if (passwordInput !== ADMIN_PASSWORD) {
      return Alert.alert("Falha", "Senha incorreta.");
    }
    if (!user || !currentProduto) return;
    try {
      // Usa o caminho 'produtos'
      await remove(ref(database, `users/${user.uid}/produtos/${currentProduto.id}`));
      Alert.alert("Sucesso", "Produto excluído.");
      setIsDeleteModalVisible(false);
      setPasswordInput('');
    } catch (error) { 
      Alert.alert("Erro", "Não foi possível excluir."); 
    }
  };

  const renderItem: ListRenderItem<Produto> = ({ item }) => (
    <ProdutoCard item={item} onEdit={openEditModal} onDelete={openDeleteModal} />
  );

  return (
    <ImageBackground 
      source={require('../../assets/images/logo.jpg')}
      style={styles.background}
      blurRadius={5}
    >
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <View style={styles.overlay} />
      
      <Animated.ScrollView 
        style={[styles.container, { opacity: fadeAnim }]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Catálogo de Produtos</Text>
          <Text style={styles.subtitle}>
            {produtos.length} {produtos.length === 1 ? 'modelo cadastrado' : 'modelos cadastrados'}
          </Text>
        </View>

        <Pressable 
          style={({ pressed }) => [styles.addButton, pressed && styles.pressed]} 
          onPress={openAddModal}
        >
          <Ionicons name="add-circle-outline" size={24} color="#fff" />
          <Text style={styles.addButtonText}>Novo Produto</Text>
        </Pressable>

        {produtos.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="pricetags-outline" size={64} color="rgba(255,255,255,0.3)" />
            </View>
            <Text style={styles.emptyTitle}>Nenhum Produto no Catálogo</Text>
            <Text style={styles.emptyText}>
              Adicione modelos de tênis para gerenciar seu estoque e vendas.
            </Text>
          </View>
        ) : (
          <FlatList 
            data={produtos} 
            renderItem={renderItem} 
            keyExtractor={item => item.id}
            scrollEnabled={false}
            contentContainerStyle={styles.listContainer}
          />
        )}
      </Animated.ScrollView>

      {/* MODAL ADICIONAR/EDITAR */}
      <Modal 
        visible={isAddOrEditModalVisible} 
        onRequestClose={() => setIsAddOrEditModalVisible(false)} 
        animationType="slide"
      >
        <View style={styles.modalBackground}>
          <StatusBar barStyle="dark-content" />
          <KeyboardAvoidingView 
            behavior={Platform.OS === "ios" ? "padding" : "height"} 
            style={{ flex: 1 }}
          >
            <ScrollView 
              style={styles.modalContainer}
              contentContainerStyle={styles.modalScrollContent}
            >
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>
                    {currentProduto ? 'Editar Produto' : 'Novo Produto'}
                  </Text>
                  <Text style={styles.modalSubtitle}>
                    {currentProduto ? 'Atualize o modelo e preço' : 'Detalhes do novo modelo de tênis'}
                  </Text>
                </View>
                <Pressable 
                  style={styles.closeButton} 
                  onPress={() => setIsAddOrEditModalVisible(false)}
                >
                  <Ionicons name="close" size={24} color="#64748B" />
                </Pressable>
              </View>

              <View style={styles.modalCard}>
                <ProdutoForm 
                    formState={formState} 
                    onFormChange={handleFormChange}
                    onSelectCategoria={() => setIsCategoriaModalVisible(true)}
                    onSelectGenero={() => setIsGeneroModalVisible(true)}
                />
                
                <View style={styles.modalButtons}>
                  <Pressable 
                    style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]} 
                    onPress={() => setIsAddOrEditModalVisible(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancelar</Text>
                  </Pressable>
                  
                  <Pressable 
                    style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]} 
                    onPress={handleAddOrUpdateProduto}
                  >
                    <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                    <Text style={styles.saveButtonText}>
                      {currentProduto ? 'Atualizar' : 'Salvar'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* MODAL SELEÇÃO DE CATEGORIA */}
      <Modal 
        visible={isCategoriaModalVisible} 
        onRequestClose={() => setIsCategoriaModalVisible(false)} 
        transparent 
        animationType="fade"
      >
        <View style={styles.selectionModalOverlay}>
          <View style={styles.selectionModalContent}>
            <Text style={styles.selectionModalTitle}>Selecione a Categoria</Text>
            {CATEGORIAS.map((cat) => (
              <Pressable
                key={cat.value}
                style={[
                  styles.selectionItem, 
                  formState.categoria === cat.value && styles.selectedItem
                ]}
                onPress={() => {
                  handleFormChange('categoria', cat.value);
                  setIsCategoriaModalVisible(false);
                }}
              >
                <Ionicons name={cat.icon} size={20} color={formState.categoria === cat.value ? '#0EA5E9' : '#475569'} />
                <Text style={styles.selectionItemText}>{cat.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>

      {/* MODAL SELEÇÃO DE GÊNERO */}
      <Modal 
        visible={isGeneroModalVisible} 
        onRequestClose={() => setIsGeneroModalVisible(false)} 
        transparent 
        animationType="fade"
      >
        <View style={styles.selectionModalOverlay}>
          <View style={styles.selectionModalContent}>
            <Text style={styles.selectionModalTitle}>Selecione o Gênero</Text>
            {GENEROS.map((gen) => (
              <Pressable
                key={gen.value}
                style={[
                  styles.selectionItem, 
                  formState.genero === gen.value && styles.selectedItem
                ]}
                onPress={() => {
                  handleFormChange('genero', gen.value);
                  setIsGeneroModalVisible(false);
                }}
              >
                <Ionicons name={gen.icon} size={20} color={formState.genero === gen.value ? '#0EA5E9' : '#475569'} />
                <Text style={styles.selectionItemText}>{gen.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>

      {/* MODAL EXCLUIR */}
      <Modal 
        visible={isDeleteModalVisible} 
        onRequestClose={() => setIsDeleteModalVisible(false)} 
        transparent={true}
        animationType="fade"
      >
        <View style={styles.deleteModalContainer}>
          <View style={styles.deleteModalContent}>
            <View style={styles.deleteModalIcon}>
              <Ionicons name="warning-outline" size={56} color="#EF4444" />
            </View>
            
            <Text style={styles.deleteModalTitle}>Confirmar Exclusão</Text>
            
            <Text style={styles.deleteModalText}>
              Deseja excluir o produto <Text style={styles.deleteModalHighlight}>"{currentProduto?.nomeModelo}"</Text> do catálogo?
            </Text>
            
            <Text style={styles.deleteModalWarning}>
              Digite a senha de administrador para confirmar.
            </Text>

            <View style={styles.passwordInputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#64748B" style={styles.inputIcon} />
              <TextInput 
                style={styles.passwordInput}
                placeholder="Senha de administrador"
                secureTextEntry
                value={passwordInput}
                onChangeText={setPasswordInput}
                placeholderTextColor="#94A3B8"
              />
            </View>

            <View style={styles.deleteModalButtons}>
              <Pressable 
                style={({ pressed }) => [styles.cancelDeleteButton, pressed && styles.pressed]} 
                onPress={() => {
                  setIsDeleteModalVisible(false);
                  setPasswordInput('');
                }}
              >
                <Text style={styles.cancelDeleteButtonText}>Cancelar</Text>
              </Pressable>
              
              <Pressable 
                style={({ pressed }) => [styles.confirmDeleteButton, pressed && styles.pressed]} 
                onPress={handleDeleteProduto}
                disabled={!passwordInput}
              >
                <Ionicons name="trash-outline" size={18} color="#fff" />
                <Text style={styles.confirmDeleteButtonText}>Excluir</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
    background: { flex: 1 },
    overlay: { 
      ...StyleSheet.absoluteFillObject, 
      backgroundColor: 'rgba(15, 23, 42, 0.92)' 
    },
    container: { flex: 1 },
    scrollContent: { 
      paddingBottom: 40 
    },
    header: {
      paddingHorizontal: 20,
      paddingTop: (Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 40) + 20,
      paddingBottom: 24,
    },
    title: {
      fontSize: 32,
      fontWeight: '800',
      color: '#fff',
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      color: 'rgba(255, 255, 255, 0.7)',
      fontWeight: '500',
    },
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#0EA5E9',
      marginHorizontal: 20,
      paddingVertical: 16,
      borderRadius: 12,
      marginBottom: 24,
      gap: 8,
    },
    addButtonText: {
      color: '#fff',
      fontWeight: '700',
      fontSize: 16,
    },
    listContainer: {
      paddingHorizontal: 20,
    },
    peixeCard: {
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    cardIcon: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: '#E0F2FE',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 16,
    },
    cardTitleContainer: {
      flex: 1,
    },
    cardTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: '#0F172A',
      marginBottom: 4,
    },
    cardSubtitle: {
      fontSize: 14,
      color: '#64748B',
      fontStyle: 'italic',
    },
    cardDivider: {
      height: 1,
      backgroundColor: '#E2E8F0',
      marginBottom: 16,
    },
    cardDetails: {
      gap: 12,
      marginBottom: 16,
    },
    detailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    detailLabel: {
      fontSize: 14,
      color: '#64748B',
      fontWeight: '500',
    },
    detailValue: {
      fontSize: 14,
      color: '#0F172A',
      fontWeight: '600',
    },
    observacoesContainer: {
      backgroundColor: '#F1F5F9',
      padding: 12,
      borderRadius: 8,
      borderLeftWidth: 3,
      borderLeftColor: '#0EA5E9',
      marginTop: 4,
    },
    observacoesLabel: {
      fontSize: 12,
      color: '#475569',
      fontWeight: '700',
      marginBottom: 6,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    observacoesText: {
      fontSize: 14,
      color: '#64748B',
      lineHeight: 20,
    },
    cardActions: {
      flexDirection: 'row',
      gap: 12,
    },
    editButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#F59E0B',
      paddingVertical: 12,
      borderRadius: 10,
      gap: 6,
    },
    deleteButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#EF4444',
      paddingVertical: 12,
      borderRadius: 10,
      gap: 6,
    },
    actionButtonText: {
      color: '#fff',
      fontWeight: '700',
      fontSize: 15,
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 80,
      paddingHorizontal: 40,
    },
    emptyIconContainer: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: 'rgba(255, 255, 255, 0.08)',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 24,
    },
    emptyTitle: {
      fontSize: 22,
      fontWeight: '700',
      color: '#fff',
      marginBottom: 12,
    },
    emptyText: {
      fontSize: 15,
      color: 'rgba(255, 255, 255, 0.7)',
      textAlign: 'center',
      lineHeight: 22,
    },
    
    // MODAL STYLES
    modalBackground: {
      flex: 1,
      backgroundColor: '#F8FAFC',
    },
    modalContainer: {
      flex: 1,
    },
    modalScrollContent: {
      paddingBottom: 40,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      paddingHorizontal: 20,
      paddingTop: (Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 40) + 20,
      paddingBottom: 20,
    },
    modalTitle: {
      fontSize: 28,
      fontWeight: '800',
      color: '#0F172A',
      marginBottom: 6,
    },
    modalSubtitle: {
      fontSize: 15,
      color: '#64748B',
    },
    closeButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: '#F1F5F9',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalCard: {
      backgroundColor: '#fff',
      marginHorizontal: 20,
      padding: 24,
      borderRadius: 16,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    formContainer: {
      gap: 20,
    },
    inputWrapper: {
      gap: 8,
    },
    inputLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: '#475569',
    },
    conditionsRow: {
      flexDirection: 'row',
      gap: 12,
    },
    inputWithIcon: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#F8FAFC',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#E2E8F0',
      paddingHorizontal: 16,
    },
    inputIcon: {
      marginRight: 12,
    },
    input: {
      flex: 1,
      paddingVertical: 14,
      fontSize: 15,
      color: '#0F172A',
    },
    textArea: {
      minHeight: 100,
      paddingTop: 14,
      paddingBottom: 14,
    },
    selectButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: '#F8FAFC',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#E2E8F0',
      paddingHorizontal: 16,
      paddingVertical: 14,
      gap: 10,
    },
    selectButtonText: {
      flex: 1,
      fontSize: 15,
      color: '#0F172A',
      fontWeight: '500',
    },
    placeholderText: {
        color: '#94A3B8',
    },
    modalButtons: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 24,
    },
    cancelButton: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#F1F5F9',
      paddingVertical: 16,
      borderRadius: 12,
    },
    cancelButtonText: {
      color: '#64748B',
      fontWeight: '700',
      fontSize: 16,
    },
    saveButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#0EA5E9',
      paddingVertical: 16,
      borderRadius: 12,
      gap: 8,
    },
    saveButtonText: {
      color: '#fff',
      fontWeight: '700',
      fontSize: 16,
    },
    
    // DELETE MODAL
    deleteModalContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.6)',
      padding: 20,
    },
    deleteModalContent: {
      backgroundColor: 'white',
      borderRadius: 20,
      padding: 28,
      width: '100%',
      maxWidth: 400,
      alignItems: 'center',
    },
    deleteModalIcon: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: '#FEE2E2',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 20,
    },
    deleteModalTitle: {
      fontSize: 22,
      fontWeight: '700',
      color: '#0F172A',
      marginBottom: 12,
      textAlign: 'center',
    },
    deleteModalText: {
      fontSize: 15,
      color: '#475569',
      textAlign: 'center',
      marginBottom: 8,
      lineHeight: 22,
    },
    deleteModalHighlight: {
      fontWeight: '700',
      color: '#0F172A',
    },
    deleteModalWarning: {
      fontSize: 13,
      color: '#64748B',
      textAlign: 'center',
      marginBottom: 24,
      lineHeight: 20,
    },
    passwordInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      width: '100%',
      marginBottom: 24,
      backgroundColor: '#F8FAFC',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#E2E8F0',
      paddingHorizontal: 16,
    },
    passwordInput: {
      flex: 1,
      paddingVertical: 14,
      fontSize: 15,
      color: '#0F172A',
    },
    deleteModalButtons: {
      flexDirection: 'row',
      gap: 12,
      width: '100%',
    },
    cancelDeleteButton: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#F1F5F9',
      paddingVertical: 14,
      borderRadius: 12,
    },
    cancelDeleteButtonText: {
      color: '#64748B',
      fontWeight: '700',
      fontSize: 15,
    },
    confirmDeleteButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#EF4444',
      paddingVertical: 14,
      borderRadius: 12,
      gap: 8,
    },
    confirmDeleteButtonText: {
      color: '#fff',
      fontWeight: '700',
      fontSize: 15,
    },
    pressed: {
      opacity: 0.7,
      transform: [{ scale: 0.98 }],
    },
    
    // SELECTION MODALS (Novo)
    selectionModalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    selectionModalContent: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        width: '85%',
        maxHeight: '60%',
    },
    selectionModalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0F172A',
        marginBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
        paddingBottom: 10,
    },
    selectionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
        gap: 10,
    },
    selectedItem: {
        backgroundColor: '#F0F9FF',
        borderRadius: 8,
        paddingHorizontal: 5,
    },
    selectionItemText: {
        fontSize: 15,
        color: '#0F172A',
        fontWeight: '500',
    },
});