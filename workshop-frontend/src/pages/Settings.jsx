import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import {
    Box,
    Typography,
    Tabs,
    Tab,
    Paper,
    Grid,
    TextField,
    Button,
    Card,
    CardContent,
    Avatar,
    Divider,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Switch,
    FormControlLabel,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    IconButton,
    Chip,
    Tooltip,
    Alert,
    CircularProgress,
    Checkbox,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    InputAdornment,
} from '@mui/material';
import {
    Person as PersonIcon,
    People as PeopleIcon,
    Security as SecurityIcon,
    Save as SaveIcon,
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Lock as LockIcon,
    CheckCircle as CheckCircleIcon,
    Cancel as CancelIcon,
    Key as KeyIcon,
    Business as BusinessIcon,
    Category as CategoryIcon,
    Settings as SettingsIcon,
    ContentCopy as ContentCopyIcon,
    Sms as SmsIcon,
    Send as SendIcon,
    ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import api, { storageUrl } from '../api/axios';
import { ENDPOINTS } from '../api/endpoints';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { useTranslation } from 'react-i18next';
import { formatSriLankanPhone } from '../utils/phoneFormatter';
import MakesAndModelsSettings from '../components/settings/MakesAndModelsSettings';
import ServicePurposeSettings from '../components/settings/ServicePurposeSettings';
import CustomServicesSettings from '../components/settings/CustomServicesSettings';

function TabPanel(props) {
    const { children, value, index, ...other } = props;
    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`settings-tabpanel-${index}`}
            aria-labelledby={`settings-tab-${index}`}
            {...other}
        >
            {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
        </div>
    );
}

const Settings = () => {
    const queryClient = useQueryClient();
    const { hasPermission, hasAnyPermission } = useAuth();
    const { settings, updateSettings } = useSettings();
    const { t } = useTranslation();
    const [currencyInput, setCurrencyInput] = useState(settings?.currency_symbol || 'Rs.');
    const [currencyCodeInput, setCurrencyCodeInput] = useState(settings?.currency_code || 'LKR');
    const [apiUrlInput, setApiUrlInput] = useState(localStorage.getItem('api_url') || settings?.api_url || 'https://mobike360.com/backend/api');
    const [revenueVisibilityInput, setRevenueVisibilityInput] = useState(settings?.revenue_visibility || 'everyone');
    const [cancelAuthCodeInput, setCancelAuthCodeInput] = useState(settings?.cancel_auth_code || '');
    const [defaultPrintFormatInput, setDefaultPrintFormatInput] = useState(settings?.default_print_format || 'a4');
    const [updatingSettings, setUpdatingSettings] = useState(false);

    // SMS Configuration States
    const [smsProviderInput, setSmsProviderInput] = useState(settings?.sms_provider || 'smslenz');
    const [smsEnabledInput, setSmsEnabledInput] = useState(settings?.sms_enabled === 'true' || settings?.sms_enabled === true);
    const [smsApiKeyInput, setSmsApiKeyInput] = useState(settings?.sms_api_key || '');
    const [smsSenderIdInput, setSmsSenderIdInput] = useState(settings?.sms_sender_id || '');
    const [smsGatewayUrlInput, setSmsGatewayUrlInput] = useState(settings?.sms_gateway_url || 'https://smslenz.lk/api/v2/send');
    const [twilioSidInput, setTwilioSidInput] = useState(settings?.twilio_sid || '');
    const [twilioTokenInput, setTwilioTokenInput] = useState(settings?.twilio_token || '');
    const [twilioFromInput, setTwilioFromInput] = useState(settings?.twilio_from || '');
    
    // Test SMS States
    const [testPhoneInput, setTestPhoneInput] = useState('');
    const [testMessageInput, setTestMessageInput] = useState('Hello from Workshop Management System! Your SMS Gateway is working successfully.');
    const [testLoading, setTestLoading] = useState(false);
    const [testResult, setTestResult] = useState(null);

    const [smsTemplatesList, setSmsTemplatesList] = useState([]);
    const [smsTemplateDialogOpen, setSmsTemplateDialogOpen] = useState(false);
    const [editingSmsTemplate, setEditingSmsTemplate] = useState(null);
    const [newTemplateId, setNewTemplateId] = useState('');
    const [newTemplateName, setNewTemplateName] = useState('');
    const [newTemplateText, setNewTemplateText] = useState('');

    useEffect(() => {
        if (settings) {
            setCurrencyInput(settings.currency_symbol || 'Rs.');
            setCurrencyCodeInput(settings.currency_code || 'LKR');
            setRevenueVisibilityInput(settings.revenue_visibility || 'everyone');
            setCancelAuthCodeInput(settings.cancel_auth_code || '');
            setDefaultPrintFormatInput(settings.default_print_format || 'a4');
            setSmsProviderInput(settings.sms_provider || 'smslenz');
            setSmsEnabledInput(settings.sms_enabled === 'true' || settings.sms_enabled === true);
            setSmsApiKeyInput(settings.sms_api_key || '');
            setSmsSenderIdInput(settings.sms_sender_id || '');
            setSmsGatewayUrlInput(settings.sms_gateway_url || 'https://smslenz.lk/api/v2/send');
            setTwilioSidInput(settings.twilio_sid || '');
            setTwilioTokenInput(settings.twilio_token || '');
            setTwilioFromInput(settings.twilio_from || '');
            if (settings.api_url) {
                setApiUrlInput(settings.api_url);
            }
            if (settings.sms_templates) {
                try {
                    setSmsTemplatesList(JSON.parse(settings.sms_templates));
                } catch (e) {
                    console.error(e);
                }
            } else {
                setSmsTemplatesList([
                    { id: 'created', name: 'Job Card Created', template: 'Hi {CustomerName}, your vehicle job card #{JobNumber} has been created at Ratnam Service Station. Est amount: {EstAmount}.' },
                    { id: 'completed', name: 'Service Completed', template: 'Hi {CustomerName}, your vehicle for job card #{JobNumber} is completed and ready for pickup. Total amount: {EstAmount}. Thank you - Ratnam Service Station.' },
                    { id: 'invoiced', name: 'Invoice Generated', template: 'Dear {CustomerName}, thank you for choosing Ratnam Service Station. Invoice for job #{JobNumber} has been generated. Total paid: {PaidAmount}.' }
                ]);
            }
        }
    }, [settings]);

    const handleSaveSmsGateway = async () => {
        setUpdatingSettings(true);
        try {
            await updateSettings({
                sms_provider: smsProviderInput,
                sms_enabled: smsEnabledInput ? 'true' : 'false',
                sms_api_key: smsApiKeyInput,
                sms_sender_id: smsSenderIdInput,
                sms_gateway_url: smsGatewayUrlInput,
                twilio_sid: twilioSidInput,
                twilio_token: twilioTokenInput,
                twilio_from: twilioFromInput,
            });
            toast.success('SMS settings saved successfully!');
        } catch {
            toast.error('Failed to update SMS settings');
        } finally {
            setUpdatingSettings(false);
        }
    };

    const handleSendTestSms = async () => {
        if (!testPhoneInput.trim()) {
            toast.error('Please enter a recipient phone number for the test');
            return;
        }
        setTestLoading(true);
        setTestResult(null);
        try {
            const res = await api.post('/sms/test', {
                phone_number: testPhoneInput,
                message: testMessageInput
            });
            setTestResult(res.data);
            toast.success('Test SMS dispatched! Check response below.');
        } catch (e) {
            console.error(e);
            const errData = e.response?.data || { success: false, message: e.message, error: e.message };
            setTestResult(errData);
            toast.error(errData.message || 'SMS Gateway test failed');
        } finally {
            setTestLoading(false);
        }
    };

    const handleOpenTemplateDialog = (tpl = null) => {
        if (tpl) {
            setEditingSmsTemplate(tpl);
            setNewTemplateId(tpl.id || tpl.name);
            setNewTemplateName(tpl.name);
            setNewTemplateText(tpl.template);
        } else {
            setEditingSmsTemplate(null);
            setNewTemplateId('');
            setNewTemplateName('');
            setNewTemplateText('');
        }
        setSmsTemplateDialogOpen(true);
    };

    const handleSaveTemplate = async () => {
        if (!newTemplateName.trim() || !newTemplateText.trim()) {
            toast.error('Template name and text cannot be empty');
            return;
        }

        let updatedList = [...smsTemplatesList];
        const newTpl = {
            id: newTemplateId || newTemplateName.toLowerCase().replace(/\s+/g, '_'),
            name: newTemplateName,
            template: newTemplateText
        };

        if (editingSmsTemplate) {
            updatedList = updatedList.map(t => (t.id === editingSmsTemplate.id || t.name === editingSmsTemplate.name) ? newTpl : t);
        } else {
            if (updatedList.some(t => t.id === newTpl.id)) {
                toast.error('A template with this name already exists');
                return;
            }
            updatedList.push(newTpl);
        }

        setUpdatingSettings(true);
        try {
            await updateSettings({
                sms_templates: JSON.stringify(updatedList)
            });
            setSmsTemplatesList(updatedList);
            setSmsTemplateDialogOpen(false);
            toast.success('SMS Template saved successfully!');
        } catch {
            toast.error('Failed to save SMS Template');
        } finally {
            setUpdatingSettings(false);
        }
    };

    const handleDeleteTemplate = async (tpl) => {
        if (!window.confirm(`Are you sure you want to delete the template "${tpl.name}"?`)) {
            return;
        }
        const updatedList = smsTemplatesList.filter(t => t.id !== tpl.id && t.name !== tpl.name);
        setUpdatingSettings(true);
        try {
            await updateSettings({
                sms_templates: JSON.stringify(updatedList)
            });
            setSmsTemplatesList(updatedList);
            toast.success('SMS Template deleted successfully!');
        } catch {
            toast.error('Failed to delete SMS Template');
        } finally {
            setUpdatingSettings(false);
        }
    };
    
    // Define tabs dynamically based on user permissions
    const tabConfig = [
        { label: 'My Profile', displayLabel: t('settings.myProfile') || 'My Profile', icon: <PersonIcon />, visible: true },
        { label: 'User Directory', displayLabel: t('settings.userDirectory') || 'User Directory', icon: <PeopleIcon />, visible: hasAnyPermission(['view users', 'create users', 'edit users', 'delete users']) },
        { label: 'Roles & Permissions', displayLabel: t('settings.rolesPermissions') || 'Roles & Permissions', icon: <SecurityIcon />, visible: hasPermission('manage settings') },
        { label: 'Branches', displayLabel: t('settings.branches') || 'Branches', icon: <BusinessIcon />, visible: hasAnyPermission(['view branches', 'create branches', 'edit branches', 'delete branches']) },
        { label: 'Categories', displayLabel: t('settings.categories') || 'Categories', icon: <CategoryIcon />, visible: hasAnyPermission(['view categories', 'create categories', 'edit categories', 'delete categories']) },
        { label: 'General Settings', displayLabel: t('settings.general') || 'General Settings', icon: <SettingsIcon />, visible: hasPermission('manage settings') },
        { label: 'SMS Settings', displayLabel: 'SMS Settings', icon: <SmsIcon />, visible: hasPermission('manage settings') },
    ];

    const visibleTabs = tabConfig.filter(t => t.visible);
    const [activeTabLabel, setActiveTabLabel] = useState('My Profile');

    // Find active index based on label
    const activeTabIdx = visibleTabs.findIndex(t => t.label === activeTabLabel);
    const currentTabVal = activeTabIdx !== -1 ? activeTabIdx : 0;

    const handleTabChange = (event, newValue) => {
        const selectedTab = visibleTabs[newValue];
        if (selectedTab) {
            setActiveTabLabel(selectedTab.label);
        }
    };

    // User Dialogs
    const [userDialogOpen, setUserDialogOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false);
    const [selectedUserForPermissions, setSelectedUserForPermissions] = useState(null);
    const [userDirectPermissions, setUserDirectPermissions] = useState([]);
    const [selectedImageFile, setSelectedImageFile] = useState(null);
    const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
    const [removePhotoFlag, setRemovePhotoFlag] = useState(false);

    // Role Dialogs
    const [roleDialogOpen, setRoleDialogOpen] = useState(false);
    const [editingRole, setEditingRole] = useState(null);
    const [roleNameInput, setRoleNameInput] = useState('');
    const [rolePermissionsInput, setRolePermissionsInput] = useState([]);

    // Branch Dialogs
    const [branchDialogOpen, setBranchDialogOpen] = useState(false);
    const [editingBranch, setEditingBranch] = useState(null);

    // Category Dialogs
    const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);

    // Filters for User Listing
    const [userSearch, setUserSearch] = useState('');
    const [filterBranch, setFilterBranch] = useState('');
    const [filterRole, setFilterRole] = useState('');
    const [filterActive, setFilterActive] = useState('');
    const [userPage, setUserPage] = useState(1);

    // ==========================================
    // DATA FETCHING (React Query)
    // ==========================================

    // Fetch branches
    const { data: branches = [], isLoading: branchesLoading } = useQuery({
        queryKey: ['branches'],
        queryFn: async () => {
            const res = await api.get(ENDPOINTS.BRANCHES, { skipAuthToast: true });
            return res.data?.data ?? res.data ?? [];
        },
    });

    // Fetch system roles (contains permissions)
    const { data: roles = [] } = useQuery({
        queryKey: ['roles'],
        queryFn: async () => {
            const res = await api.get('/users/roles', { skipAuthToast: true });
            return res.data;
        },
    });

    // Fetch system permissions
    const { data: allPermissions = [] } = useQuery({
        queryKey: ['permissions'],
        queryFn: async () => {
            const res = await api.get('/users/permissions', { skipAuthToast: true });
            return res.data;
        },
    });

    // Fetch categories
    const { data: categories = [], isLoading: categoriesLoading } = useQuery({
        queryKey: ['categories-list'],
        queryFn: async () => {
            const res = await api.get('/categories', { skipAuthToast: true });
            return res.data ?? [];
        },
    });

    // Fetch profile of the logged-in user
    const { data: profileData, isLoading: profileLoading } = useQuery({
        queryKey: ['profile'],
        queryFn: async () => {
            const res = await api.get('/users/profile', { skipAuthToast: true });
            return res.data;
        },
    });

    // Fetch users (paginated + filtered)
    const { data: usersData, isLoading: usersLoading } = useQuery({
        queryKey: ['users', userPage, userSearch, filterBranch, filterRole, filterActive],
        queryFn: async () => {
            const params = new URLSearchParams();
            params.append('page', userPage);
            if (userSearch) params.append('search', userSearch);
            if (filterBranch) params.append('branch_id', filterBranch);
            if (filterRole) params.append('role', filterRole);
            if (filterActive !== '') params.append('is_active', filterActive);
            const res = await api.get(`${ENDPOINTS.USERS}?${params.toString()}`, { skipAuthToast: true });
            return res.data;
        },
    });

    // ==========================================
    // MUTATIONS
    // ==========================================

    // Profile updates
    const updateProfileMutation = useMutation({
        mutationFn: (data) => api.put('/users/profile', data),
        onSuccess: (res) => {
            toast.success(res.data.message || 'Profile updated successfully!');
            queryClient.invalidateQueries(['profile']);
        },
        onError: (err) => {
            toast.error(err.response?.data?.error || 'Failed to update profile');
        },
    });

    // Create user
    const createUserMutation = useMutation({
        mutationFn: (data) => api.post(ENDPOINTS.USERS, data),
        onSuccess: () => {
            toast.success('User created successfully!');
            setUserDialogOpen(false);
            queryClient.invalidateQueries(['users']);
        },
        onError: (err) => {
            toast.error('Failed to create user');
        },
    });

    // Update user
    const updateUserMutation = useMutation({
        mutationFn: ({ id, data }) => {
            if (data instanceof FormData) {
                return api.post(`${ENDPOINTS.USERS}/${id}`, data);
            }
            return api.put(`${ENDPOINTS.USERS}/${id}`, data);
        },
        onSuccess: () => {
            toast.success('User updated successfully!');
            setUserDialogOpen(false);
            setEditingUser(null);
            queryClient.invalidateQueries(['users']);
        },
        onError: (err) => {
            toast.error('Failed to update user');
        },
    });

    // Delete user
    const deleteUserMutation = useMutation({
        mutationFn: (id) => api.delete(`${ENDPOINTS.USERS}/${id}`),
        onSuccess: () => {
            toast.success('User deleted successfully!');
            queryClient.invalidateQueries(['users']);
        },
        onError: (err) => {
            toast.error(err.response?.data?.error || 'Failed to delete user');
        },
    });

    // Assign custom permissions to a user
    const assignPermissionsMutation = useMutation({
        mutationFn: ({ id, permissions }) => api.post(`/users/${id}/permissions`, { permissions }),
        onSuccess: () => {
            toast.success('Custom permissions updated successfully!');
            setPermissionsDialogOpen(false);
            queryClient.invalidateQueries(['users']);
        },
        onError: () => toast.error('Failed to assign permissions'),
    });

    // Create role
    const createRoleMutation = useMutation({
        mutationFn: (data) => api.post('/roles', data),
        onSuccess: () => {
            toast.success('Role created successfully!');
            setRoleDialogOpen(false);
            queryClient.invalidateQueries(['roles']);
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed to create role'),
    });

    // Update role permissions
    const updateRoleMutation = useMutation({
        mutationFn: ({ id, data }) => api.put(`/roles/${id}`, data),
        onSuccess: () => {
            toast.success('Role updated successfully!');
            setRoleDialogOpen(false);
            queryClient.invalidateQueries(['roles']);
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed to update role'),
    });

    // Delete role
    const deleteRoleMutation = useMutation({
        mutationFn: (id) => api.delete(`/roles/${id}`),
        onSuccess: () => {
            toast.success('Role deleted!');
            queryClient.invalidateQueries(['roles']);
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed to delete role'),
    });

    // Create branch
    const createBranchMutation = useMutation({
        mutationFn: (data) => api.post(ENDPOINTS.BRANCHES, data),
        onSuccess: () => {
            toast.success('Branch created successfully!');
            setBranchDialogOpen(false);
            queryClient.invalidateQueries(['branches']);
        },
        onError: () => toast.error('Failed to create branch'),
    });

    // Update branch
    const updateBranchMutation = useMutation({
        mutationFn: ({ id, data }) => api.put(`${ENDPOINTS.BRANCHES}/${id}`, data),
        onSuccess: () => {
            toast.success('Branch updated successfully!');
            setBranchDialogOpen(false);
            setEditingBranch(null);
            queryClient.invalidateQueries(['branches']);
        },
        onError: () => toast.error('Failed to update branch'),
    });

    // Delete branch
    const deleteBranchMutation = useMutation({
        mutationFn: (id) => api.delete(`${ENDPOINTS.BRANCHES}/${id}`),
        onSuccess: () => {
            toast.success('Branch deleted successfully!');
            queryClient.invalidateQueries(['branches']);
        },
        onError: (err) => toast.error(err.response?.data?.error || 'Failed to delete branch'),
    });

    // Create category
    const createCategoryMutation = useMutation({
        mutationFn: (data) => api.post('/categories', data),
        onSuccess: () => {
            toast.success('Category created successfully!');
            setCategoryDialogOpen(false);
            queryClient.invalidateQueries(['categories-list']);
        },
        onError: () => toast.error('Failed to create category'),
    });

    // Update category
    const updateCategoryMutation = useMutation({
        mutationFn: ({ id, data }) => api.put(`/categories/${id}`, data),
        onSuccess: () => {
            toast.success('Category updated successfully!');
            setCategoryDialogOpen(false);
            setEditingCategory(null);
            queryClient.invalidateQueries(['categories-list']);
        },
        onError: () => toast.error('Failed to update category'),
    });

    // Delete category
    const deleteCategoryMutation = useMutation({
        mutationFn: (id) => api.delete(`/categories/${id}`),
        onSuccess: () => {
            toast.success('Category deleted successfully!');
            queryClient.invalidateQueries(['categories-list']);
        },
        onError: (err) => toast.error(err.response?.data?.error || 'Failed to delete category'),
    });

    // ==========================================
    // FORMS SETUP (React Hook Form)
    // ==========================================

    // Profile Form
    const {
        register: registerProfile,
        handleSubmit: handleProfileSubmit,
        formState: { errors: profileErrors },
    } = useForm({
        values: profileData ? {
            name: profileData.name || '',
            username: profileData.username || '',
            email: profileData.email || '',
            phone: profileData.phone || '',
            address: profileData.address || '',
        } : {},
    });

    // Profile Password Form
    const {
        register: registerPassword,
        handleSubmit: handlePasswordSubmit,
        reset: resetPassword,
        formState: { errors: passwordErrors },
    } = useForm();

    // User Form (Create/Edit)
    const {
        register: registerUser,
        handleSubmit: handleUserSubmit,
        reset: resetUser,
        control: userControl,
        watch: watchUser,
        setValue: setUserValue,
        formState: { errors: userErrors },
    } = useForm();

    // Auto-generate username from first + last name (max 8 chars, uppercase)
    const watchedFirstName = watchUser ? watchUser('first_name') : '';
    const watchedLastName  = watchUser ? watchUser('last_name')  : '';

    const generateUsername = (first = '', last = '') => {
        const f = (first || '').replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 4);
        const l = (last  || '').replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 4);
        return (f + l).slice(0, 8);
    };

    const generatedUsername = generateUsername(watchedFirstName, watchedLastName);

    // Branch Form
    const {
        register: registerBranch,
        handleSubmit: handleBranchSubmit,
        reset: resetBranch,
        formState: { errors: branchErrors },
    } = useForm();

    // Category Form
    const {
        register: registerCategory,
        handleSubmit: handleCategorySubmit,
        reset: resetCategory,
        control: categoryControl,
        formState: { errors: categoryErrors },
    } = useForm();

    // ==========================================
    // ACTION HANDLERS
    // ==========================================

    const handleSaveProfile = (data) => {
        const payload = { ...data };
        if (payload.username) {
            payload.username = payload.username.toUpperCase();
        }
        updateProfileMutation.mutate(payload);
    };

    const handleSavePassword = (data) => {
        if (data.new_password !== data.new_password_confirmation) {
            toast.error('New passwords do not match');
            return;
        }
        updateProfileMutation.mutate({
            current_password: data.current_password,
            new_password: data.new_password,
            new_password_confirmation: data.new_password_confirmation,
        });
        resetPassword({ current_password: '', new_password: '', new_password_confirmation: '' });
    };

    // User managers
    const handleOpenCreateUser = () => {
        setEditingUser(null);
        setSelectedImageFile(null);
        setImagePreviewUrl(null);
        setRemovePhotoFlag(false);
        resetUser({
            first_name: '',
            last_name: '',
            username: '',
            email: '',
            phone: '',
            address: '',
            branch_id: '',
            employee_id: '',
            identity_card_no: '',
            bank_name: '',
            bank_branch: '',
            bank_account_no: '',
            dob: '',
            joining_date: '',
            salary: '',
            salary_rate_type: 'monthly',
            leave_days_per_year: 21,
            role: '',
            is_active: true,
            epf_etf: false,
            password: '',
            password_confirmation: '',
        });
        setUserDialogOpen(true);
    };

    const handleOpenEditUser = (user) => {
        setEditingUser(user);
        setSelectedImageFile(null);
        setImagePreviewUrl(storageUrl(user.profile_image) || null);
        setRemovePhotoFlag(false);
        
        // Handle name splitting fallback for old users
        const names = (user.name || '').trim().split(/\s+/);
        const fallbackFirstName = names[0] || '';
        const fallbackLastName = names.slice(1).join(' ') || '';

        resetUser({
            first_name: user.first_name || fallbackFirstName,
            last_name: user.last_name || fallbackLastName,
            username: user.username || generateUsername(user.first_name || fallbackFirstName, user.last_name || fallbackLastName),
            email: user.email || '',
            phone: user.phone || '',
            address: user.address || '',
            branch_id: user.branch_id || '',
            employee_id: user.employee_id || '',
            identity_card_no: user.identity_card_no || '',
            bank_name: user.bank_name || '',
            bank_branch: user.bank_branch || '',
            bank_account_no: user.bank_account_no || '',
            dob: user.dob ? user.dob.split('T')[0] : '',
            joining_date: user.joining_date ? user.joining_date.split('T')[0] : '',
            salary: user.salary || '',
            salary_rate_type: user.salary_rate_type || 'monthly',
            leave_days_per_year: user.leave_days_per_year ?? 21,
            role: user.roles?.[0]?.name || '',
            is_active: user.is_active ?? true,
            epf_etf: !!user.epf_etf,
        });
        setUserDialogOpen(true);
    };

    const handleSaveUser = (data) => {
        const formData = new FormData();
        // Use manually edited username if provided, otherwise fallback to the auto-generated one
        const payload = { ...data };
        payload.username = payload.username?.trim() ? payload.username : generatedUsername;

        Object.keys(payload).forEach((key) => {
            if (payload[key] !== undefined && payload[key] !== null) {
                let val = payload[key];
                // Capitalize key fields
                if (typeof val === 'string' && ['first_name', 'last_name', 'identity_card_no', 'bank_name', 'bank_branch', 'employee_id', 'username'].includes(key)) {
                    val = val.toUpperCase();
                }
                // If value is boolean, convert to 1 or 0 for PHP compatibility in FormData
                if (typeof val === 'boolean') {
                    formData.append(key, val ? '1' : '0');
                } else {
                    formData.append(key, val);
                }
            }
        });

        if (selectedImageFile) {
            formData.append('profile_image', selectedImageFile);
        } else if (removePhotoFlag) {
            formData.append('remove_profile_image', '1');
        }

        if (!editingUser) {
            if (!data.password) {
                toast.error('Password is required for new users');
                return;
            }
            if (data.password !== data.password_confirmation) {
                toast.error('Passwords do not match');
                return;
            }
            createUserMutation.mutate(formData);
        } else {
            if (data.password && data.password !== data.password_confirmation) {
                toast.error('Passwords do not match');
                return;
            }
            // For Laravel PUT requests with file uploads, we must use POST and append _method: 'PUT'
            formData.append('_method', 'PUT');
            updateUserMutation.mutate({ id: editingUser.id, data: formData });
        }
    };

    const handleDeleteUser = (id) => {
        if (window.confirm('Are you sure you want to delete this user?')) {
            deleteUserMutation.mutate(id);
        }
    };

    const handleOpenPermissions = async (user) => {
        setSelectedUserForPermissions(user);
        try {
            const res = await api.get(`/users/${user.id}/permissions`);
            setUserDirectPermissions(res.data.permissions || []);
            setPermissionsDialogOpen(true);
        } catch {
            toast.error('Could not load user permissions');
        }
    };

    const handlePermissionToggle = (permissionName) => {
        setUserDirectPermissions((prev) =>
            prev.includes(permissionName)
                ? prev.filter((p) => p !== permissionName)
                : [...prev, permissionName]
        );
    };

    const handleSaveUserPermissions = () => {
        assignPermissionsMutation.mutate({
            id: selectedUserForPermissions.id,
            permissions: userDirectPermissions,
        });
    };

    // Role managers
    const handleOpenCreateRole = () => {
        setEditingRole(null);
        setRoleNameInput('');
        setRolePermissionsInput([]);
        setRoleDialogOpen(true);
    };

    const handleOpenEditRole = (role) => {
        setEditingRole(role);
        setRoleNameInput(role.name);
        setRolePermissionsInput(role.permissions?.map((p) => p.name) ?? []);
        setRoleDialogOpen(true);
    };

    const handleRolePermissionToggle = (permName) => {
        setRolePermissionsInput((prev) =>
            prev.includes(permName)
                ? prev.filter((p) => p !== permName)
                : [...prev, permName]
        );
    };

    const handleSaveRole = () => {
        if (!roleNameInput.trim()) { toast.error('Role name is required'); return; }
        if (editingRole) {
            updateRoleMutation.mutate({ id: editingRole.id, data: { name: roleNameInput, permissions: rolePermissionsInput } });
        } else {
            createRoleMutation.mutate({ name: roleNameInput, permissions: rolePermissionsInput });
        }
    };

    const handleDeleteRole = (role) => {
        if (window.confirm(`Delete role "${role.name}"? Users with this role will lose it.`)) {
            deleteRoleMutation.mutate(role.id);
        }
    };

    // Branch managers
    const handleOpenCreateBranch = () => {
        setEditingBranch(null);
        resetBranch({
            name: '',
            address: '',
            phone: '',
            email: '',
            tax_id: '',
            is_active: true,
        });
        setBranchDialogOpen(true);
    };

    const handleOpenEditBranch = (branch) => {
        setEditingBranch(branch);
        resetBranch({
            name: branch.name ?? '',
            address: branch.address ?? '',
            phone: branch.phone ?? '',
            email: branch.email ?? '',
            tax_id: branch.tax_id ?? '',
            is_active: branch.is_active ?? true,
        });
        setBranchDialogOpen(true);
    };

    const handleSaveBranch = (data) => {
        if (editingBranch) {
            updateBranchMutation.mutate({ id: editingBranch.id, data });
        } else {
            createBranchMutation.mutate(data);
        }
    };

    const handleDeleteBranch = (id) => {
        if (window.confirm('Are you sure you want to delete this branch?')) {
            deleteBranchMutation.mutate(id);
        }
    };

    // Category managers
    const handleOpenCreateCategory = () => {
        setEditingCategory(null);
        resetCategory({
            name: '',
            description: '',
            parent_id: '',
            branch_id: '',
        });
        setCategoryDialogOpen(true);
    };

    const handleOpenEditCategory = (cat) => {
        setEditingCategory(cat);
        resetCategory({
            name: cat.name ?? '',
            description: cat.description ?? '',
            parent_id: cat.parent_id ?? '',
            branch_id: cat.branch_id ?? '',
        });
        setCategoryDialogOpen(true);
    };

    const handleSaveCategory = (data) => {
        // filter empty strings for parent_id
        const payload = { ...data };
        if (payload.parent_id === '') delete payload.parent_id;

        if (editingCategory) {
            updateCategoryMutation.mutate({ id: editingCategory.id, data: payload });
        } else {
            createCategoryMutation.mutate(payload);
        }
    };

    const handleDeleteCategory = (id) => {
        if (window.confirm('Are you sure you want to delete this category?')) {
            deleteCategoryMutation.mutate(id);
        }
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, width: '100%' }}>
            {/* Header */}
            <Box>
                <Typography variant="h3" sx={{ fontWeight: 800, mb: 0.5, letterSpacing: '-0.03em' }}>
                    {t('settings.title') || 'Settings'}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                    {t('settings.subtitle') || 'Configure your workspace, branch units, inventories categories, profiles and system roles.'}
                </Typography>
            </Box>

            {/* Navigation Tabs */}
            <Paper sx={{ borderRadius: '14px', overflow: 'hidden' }}>
                <Tabs
                    value={currentTabVal}
                    onChange={handleTabChange}
                    textColor="primary"
                    indicatorColor="primary"
                    variant="scrollable"
                    scrollButtons="auto"
                    sx={{
                        borderBottom: 1,
                        borderColor: 'divider',
                        '& .MuiTab-root': { py: 2, fontWeight: 700 },
                    }}
                >
                    {visibleTabs.map((tab, idx) => (
                        <Tab key={tab.label} icon={tab.icon} iconPosition="start" label={tab.displayLabel} />
                    ))}
                </Tabs>
            </Paper>

            {/* PROFILE TAB */}
            <TabPanel value={activeTabLabel} index="My Profile">
                {profileLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <Grid container spacing={4}>
                        {/* Profile Info Summary Card */}
                        <Grid item xs={12} md={4}>
                            <Card sx={{ borderRadius: '16px', height: '100%', border: '1px solid', borderColor: 'divider' }}>
                                <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', py: 4 }}>
                                    <Avatar
                                        src={storageUrl(profileData?.profile_image)}
                                        sx={{ width: 120, height: 120, mb: 2, bgcolor: 'primary.main', fontSize: '3rem', fontWeight: 600 }}
                                    >
                                        {profileData?.name?.charAt(0).toUpperCase()}
                                    </Avatar>
                                    <Typography variant="h5" sx={{ fontWeight: 700 }}>
                                        {profileData?.name}
                                    </Typography>
                                    
                                    {profileData?.username ? (
                                        <Tooltip title="Copy Login ID">
                                            <Chip 
                                                label={`ID: ${profileData.username}`}
                                                size="small"
                                                icon={<KeyIcon style={{ fontSize: 12 }} />}
                                                onClick={() => {
                                                    navigator.clipboard.writeText(profileData.username);
                                                    toast.success('Login ID copied to clipboard');
                                                }}
                                                sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.75rem', mt: 1, mb: 1, letterSpacing: '0.05em', cursor: 'pointer' }}
                                                variant="outlined"
                                                color="primary"
                                            />
                                        </Tooltip>
                                    ) : (
                                        <Chip 
                                            label="ID: Not set"
                                            size="small"
                                            icon={<KeyIcon style={{ fontSize: 12 }} />}
                                            sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.75rem', mt: 1, mb: 1, letterSpacing: '0.05em' }}
                                            variant="outlined"
                                            color="default"
                                        />
                                    )}

                                    <Typography variant="body2" color="textSecondary" sx={{ mb: 2, mt: 0 }}>
                                        {profileData?.email || 'No email provided'}
                                    </Typography>
                                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center', mb: 2 }}>
                                        {profileData?.roles?.map((r) => (
                                            <Chip key={r.name} label={r.name.toUpperCase()} color="primary" size="small" sx={{ fontWeight: 600 }} />
                                        ))}
                                    </Box>
                                    {profileData?.branch && (
                                        <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary' }}>
                                            <BusinessIcon fontSize="small" /> Branch: {profileData.branch.name}
                                        </Typography>
                                    )}
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* Edit profile form panels */}
                        <Grid item xs={12} md={8} sx={{ display: 'flex', flexDirection: 'column', gap: 3.5 }}>
                            {/* General Details */}
                            <Paper sx={{ p: 3, borderRadius: '16px', border: '1px solid', borderColor: 'divider' }}>
                                <Typography variant="h6" sx={{ fontWeight: 800, mb: 3 }}>
                                    Personal Details
                                </Typography>
                                <form onSubmit={handleProfileSubmit(handleSaveProfile)}>
                                    <Grid container spacing={2.5}>
                                        <Grid item xs={12} sm={6}>
                                            <TextField
                                                fullWidth
                                                label="Full Name"
                                                {...registerProfile('name', { required: 'Name is required' })}
                                                error={!!profileErrors.name}
                                                helperText={profileErrors.name?.message}
                                            />
                                        </Grid>
                                        <Grid item xs={12} sm={6}>
                                            <TextField
                                                fullWidth
                                                label="Login ID (Max 8 chars)"
                                                inputProps={{ maxLength: 8, style: { textTransform: 'uppercase' } }}
                                                {...registerProfile('username', { 
                                                    maxLength: { value: 8, message: 'Max 8 characters' }
                                                })}
                                                error={!!profileErrors.username}
                                                helperText={profileErrors.username?.message}
                                            />
                                        </Grid>
                                        <Grid item xs={12} sm={6}>
                                            <TextField
                                                fullWidth
                                                label="Email Address"
                                                type="email"
                                                {...registerProfile('email')}
                                                error={!!profileErrors.email}
                                                helperText={profileErrors.email?.message}
                                            />
                                        </Grid>
                                        <Grid item xs={12} sm={6}>
                                            <TextField
                                                fullWidth
                                                label="Phone Number"
                                                {...registerProfile('phone')}
                                            />
                                        </Grid>
                                        <Grid item xs={12} sm={6}>
                                            <TextField
                                                fullWidth
                                                label="Residential Address"
                                                {...registerProfile('address')}
                                            />
                                        </Grid>
                                        <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                                            <Button type="submit" variant="contained" startIcon={<SaveIcon />} sx={{ borderRadius: '10px', fontWeight: 700 }}>
                                                Save Details
                                            </Button>
                                        </Grid>
                                    </Grid>
                                </form>
                            </Paper>

                            {/* Password Settings */}
                            <Paper sx={{ p: 3, borderRadius: '16px', border: '1px solid', borderColor: 'divider' }}>
                                <Typography variant="h6" sx={{ fontWeight: 800, mb: 3 }}>
                                    Security & Password
                                </Typography>
                                <form onSubmit={handlePasswordSubmit(handleSavePassword)}>
                                    <Grid container spacing={2.5}>
                                        <Grid item xs={12} sm={4}>
                                            <TextField
                                                fullWidth
                                                type="password"
                                                label="Current Password"
                                                {...registerPassword('current_password', { required: 'Current password is required' })}
                                                error={!!passwordErrors.current_password}
                                                helperText={passwordErrors.current_password?.message}
                                            />
                                        </Grid>
                                        <Grid item xs={12} sm={4}>
                                            <TextField
                                                fullWidth
                                                type="password"
                                                label="New Password"
                                                {...registerPassword('new_password', { required: 'New password is required' })}
                                                error={!!passwordErrors.new_password}
                                                helperText={passwordErrors.new_password?.message}
                                            />
                                        </Grid>
                                        <Grid item xs={12} sm={4}>
                                            <TextField
                                                fullWidth
                                                type="password"
                                                label="Confirm New Password"
                                                {...registerPassword('new_password_confirmation', { required: 'Please confirm password' })}
                                                error={!!passwordErrors.new_password_confirmation}
                                                helperText={passwordErrors.new_password_confirmation?.message}
                                            />
                                        </Grid>
                                        <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                                            <Button type="submit" variant="contained" startIcon={<LockIcon />} sx={{ borderRadius: '10px', fontWeight: 700 }}>
                                                Update Password
                                            </Button>
                                        </Grid>
                                    </Grid>
                                </form>
                            </Paper>
                        </Grid>
                    </Grid>
                )}
            </TabPanel>

            {/* USER DIRECTORY TAB */}
            <TabPanel value={activeTabLabel} index="User Directory">
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5 }}>
                    {/* Top Action Filter Row */}
                    <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
                        <Box display="flex" gap={1.5} flexWrap="wrap" sx={{ flexGrow: 1 }}>
                            <TextField
                                label="Search users..."
                                size="small"
                                value={userSearch}
                                onChange={(e) => { setUserSearch(e.target.value); setUserPage(1); }}
                                sx={{ minWidth: 200, bgcolor: 'background.paper', borderRadius: '8px' }}
                            />
                            <FormControl size="small" sx={{ minWidth: 150 }}>
                                <InputLabel>Branch</InputLabel>
                                <Select
                                    value={filterBranch}
                                    onChange={(e) => { setFilterBranch(e.target.value); setUserPage(1); }}
                                    label="Branch"
                                >
                                    <MenuItem value="">All Branches</MenuItem>
                                    {branches.map((b) => (
                                        <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <FormControl size="small" sx={{ minWidth: 150 }}>
                                <InputLabel>Role</InputLabel>
                                <Select
                                    value={filterRole}
                                    onChange={(e) => { setFilterRole(e.target.value); setUserPage(1); }}
                                    label="Role"
                                >
                                    <MenuItem value="">All Roles</MenuItem>
                                    {roles.map((r) => (
                                        <MenuItem key={r.id} value={r.name}>{r.name.toUpperCase()}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Box>
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={handleOpenCreateUser}
                            sx={{ borderRadius: '10px', fontWeight: 700 }}
                        >
                            Add New User
                        </Button>
                    </Box>

                    {/* Users list grid */}
                    {usersLoading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                            <CircularProgress />
                        </Box>
                    ) : (
                        <Grid container spacing={3}>
                            {usersData?.data?.length === 0 ? (
                                <Grid item xs={12}>
                                    <Paper sx={{ p: 4, textAlign: 'center' }}>
                                        <Typography color="textSecondary">No employees matching search criteria.</Typography>
                                    </Paper>
                                </Grid>
                            ) : (
                                usersData?.data?.map((u) => (
                                    <Grid item xs={12} sm={6} md={4} key={u.id}>
                                        <Card sx={{ borderRadius: '16px', position: 'relative', border: '1px solid', borderColor: 'divider' }}>
                                            <CardContent sx={{ pt: 4, pb: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                                                {/* Active status bubble */}
                                                <Box sx={{ position: 'absolute', top: 12, right: 12 }}>
                                                    {u.is_active ? (
                                                        <Chip label="ACTIVE" size="small" color="success" sx={{ fontSize: '0.65rem', fontWeight: 700, height: 18 }} />
                                                    ) : (
                                                        <Chip label="INACTIVE" size="small" color="default" sx={{ fontSize: '0.65rem', fontWeight: 700, height: 18 }} />
                                                    )}
                                                </Box>
                                                <Avatar
                                                    src={storageUrl(u.profile_image)}
                                                    sx={{ width: 64, height: 64, mb: 1.5, bgcolor: 'secondary.main', fontSize: '1.5rem', fontWeight: 700 }}
                                                >
                                                    {u.name.charAt(0).toUpperCase()}
                                                </Avatar>
                                                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                                                    {u.name}
                                                </Typography>
                                                {u.username && (
                                                    <Tooltip title="Copy Login ID">
                                                        <Chip 
                                                            label={`ID: ${u.username}`}
                                                            size="small"
                                                            icon={<KeyIcon style={{ fontSize: 12 }} />}
                                                            onClick={() => {
                                                                navigator.clipboard.writeText(u.username);
                                                                toast.success('Login ID copied to clipboard');
                                                            }}
                                                            sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.7rem', mb: 0.5, letterSpacing: '0.05em', cursor: 'pointer' }}
                                                            variant="outlined"
                                                            color="primary"
                                                        />
                                                    </Tooltip>
                                                )}
                                                <Typography variant="caption" color="textSecondary" sx={{ mb: 1.5 }}>
                                                    {u.email || 'No email'}
                                                </Typography>

                                                <Box display="flex" gap={0.5} flexWrap="wrap" justifyContent="center" sx={{ mb: 1.5 }}>
                                                    {u.roles?.map((r) => (
                                                        <Chip key={r.name} label={r.name.toUpperCase()} size="small" variant="outlined" sx={{ fontWeight: 700 }} />
                                                    ))}
                                                </Box>

                                                <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary', fontSize: '0.8rem', mb: 2.5 }}>
                                                    <BusinessIcon fontSize="inherit" /> {u.branch?.name || 'No Branch'}
                                                </Typography>

                                                <Divider sx={{ width: '100%', mb: 2 }} />

                                                <Box display="flex" gap={1}>
                                                    <Tooltip title="Edit Employee">
                                                        <IconButton color="primary" size="small" onClick={() => handleOpenEditUser(u)}>
                                                            <EditIcon />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Custom Permissions">
                                                        <IconButton color="info" size="small" onClick={() => handleOpenPermissions(u)}>
                                                            <SecurityIcon />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Delete User">
                                                        <IconButton color="error" size="small" onClick={() => handleDeleteUser(u.id)}>
                                                            <DeleteIcon />
                                                        </IconButton>
                                                    </Tooltip>
                                                </Box>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                ))
                            )}
                        </Grid>
                    )}

                    {/* Pagination Controls */}
                    {usersData?.total > usersData?.per_page && (
                        <Box display="flex" justifyContent="center" sx={{ mt: 2 }}>
                            <Button
                                disabled={userPage === 1}
                                onClick={() => setUserPage((prev) => Math.max(prev - 1, 1))}
                            >
                                Previous
                            </Button>
                            <Box sx={{ display: 'flex', alignItems: 'center', px: 2 }}>
                                Page {usersData.current_page} of {usersData.last_page}
                            </Box>
                            <Button
                                disabled={userPage === usersData.last_page}
                                onClick={() => setUserPage((prev) => Math.min(prev + 1, usersData.last_page))}
                            >
                                Next
                            </Button>
                        </Box>
                    )}
                </Box>
            </TabPanel>

            {/* ROLES & PERMISSIONS TAB */}
            <TabPanel value={activeTabLabel} index="Roles & Permissions">
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Box>
                            <Typography variant="h6" fontWeight={800}>Role Management</Typography>
                            <Typography variant="body2" color="textSecondary">
                                Create roles and assign permission bundles. Users in a role inherit all its permissions.
                            </Typography>
                        </Box>
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={handleOpenCreateRole}
                            sx={{ borderRadius: '10px', fontWeight: 700 }}
                        >
                            New Role
                        </Button>
                    </Box>

                    <Grid container spacing={3}>
                        {roles.map((role) => (
                            <Grid item xs={12} md={6} key={role.id}>
                                <Card sx={{ borderRadius: '16px', height: '100%', border: '1px solid', borderColor: 'divider' }}>
                                    <CardContent>
                                        <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                                            <Typography variant="h6" sx={{ fontWeight: 800, color: 'primary.main', textTransform: 'uppercase' }}>
                                                {role.name}
                                            </Typography>
                                            <Box display="flex" alignItems="center" gap={0.5}>
                                                <Chip label={`${role.permissions?.length ?? 0} perms`} size="small" color="secondary" sx={{ fontWeight: 600 }} />
                                                <Tooltip title="Edit Role">
                                                    <IconButton size="small" onClick={() => handleOpenEditRole(role)}><EditIcon fontSize="small" /></IconButton>
                                                </Tooltip>
                                                <Tooltip title="Delete Role">
                                                    <IconButton size="small" color="error" onClick={() => handleDeleteRole(role)}><DeleteIcon fontSize="small" /></IconButton>
                                                </Tooltip>
                                            </Box>
                                        </Box>
                                        <Divider sx={{ mb: 1.5 }} />
                                        <Box display="flex" gap={0.8} flexWrap="wrap">
                                            {role.permissions?.length > 0 ? (
                                                role.permissions.map((perm) => (
                                                    <Chip
                                                        key={perm.id ?? perm.name}
                                                        label={perm.name}
                                                        size="small"
                                                        variant="outlined"
                                                        sx={{ fontSize: '0.72rem', fontWeight: 500 }}
                                                    />
                                                ))
                                            ) : (
                                                <Typography variant="body2" color="textSecondary">No permissions assigned.</Typography>
                                            )}
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                </Box>
            </TabPanel>

            {/* BRANCHES TAB */}
            <TabPanel value={activeTabLabel} index="Branches">
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Box>
                            <Typography variant="h6" fontWeight={800}>Branch Outlets</Typography>
                            <Typography variant="body2" color="textSecondary">
                                Manage branch locations, address contact coordinates and general details.
                            </Typography>
                        </Box>
                        {hasPermission('create branches') && (
                            <Button
                                variant="contained"
                                startIcon={<AddIcon />}
                                onClick={handleOpenCreateBranch}
                                sx={{ borderRadius: '10px', fontWeight: 700 }}
                            >
                                New Branch
                            </Button>
                        )}
                    </Box>

                    {branchesLoading ? (
                        <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>
                    ) : (
                        <TableContainer component={Paper} sx={{ borderRadius: '14px', border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 700 }}>Branch Name</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>Phone</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>Email</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>Tax ID</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>Address</TableCell>
                                        {hasAnyPermission(['edit branches', 'delete branches']) && (
                                            <TableCell sx={{ fontWeight: 700 }} align="right">Actions</TableCell>
                                        )}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {branches.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                                                No branches registered yet.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        branches.map((b) => (
                                            <TableRow key={b.id} hover>
                                                <TableCell sx={{ fontWeight: 700 }}>{b.name}</TableCell>
                                                <TableCell>{b.phone}</TableCell>
                                                <TableCell>{b.email ?? '-'}</TableCell>
                                                <TableCell>{b.tax_id ?? '-'}</TableCell>
                                                <TableCell>{b.address}</TableCell>
                                                {hasAnyPermission(['edit branches', 'delete branches']) && (
                                                    <TableCell align="right">
                                                        {hasPermission('edit branches') && (
                                                            <Tooltip title="Edit Branch">
                                                                <IconButton size="small" onClick={() => handleOpenEditBranch(b)}><EditIcon fontSize="small" /></IconButton>
                                                            </Tooltip>
                                                        )}
                                                        {hasPermission('delete branches') && (
                                                            <Tooltip title="Delete Branch">
                                                                <IconButton size="small" color="error" onClick={() => handleDeleteBranch(b.id)}><DeleteIcon fontSize="small" /></IconButton>
                                                            </Tooltip>
                                                        )}
                                                    </TableCell>
                                                )}
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </Box>
            </TabPanel>


            {/* CATEGORIES TAB */}
            <TabPanel value={activeTabLabel} index="Categories">
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Box>
                            <Typography variant="h6" fontWeight={800}>Inventory Categories</Typography>
                            <Typography variant="body2" color="textSecondary">
                                Group spare parts, fluids, components and services into structural categories.
                            </Typography>
                        </Box>
                        {hasPermission('create categories') && (
                            <Button
                                variant="contained"
                                startIcon={<AddIcon />}
                                onClick={handleOpenCreateCategory}
                                sx={{ borderRadius: '10px', fontWeight: 700 }}
                            >
                                New Category
                            </Button>
                        )}
                    </Box>

                    {categoriesLoading ? (
                        <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>
                    ) : (
                        <TableContainer component={Paper} sx={{ borderRadius: '14px', border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 700 }}>Category Name</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>Description</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>Parent Category</TableCell>
                                        {hasAnyPermission(['edit categories', 'delete categories']) && (
                                            <TableCell sx={{ fontWeight: 700 }} align="right">Actions</TableCell>
                                        )}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {categories.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                                                No categories registered yet.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        categories.map((c) => (
                                            <TableRow key={c.id} hover>
                                                <TableCell sx={{ fontWeight: 700 }}>{c.name}</TableCell>
                                                <TableCell>{c.description ?? '-'}</TableCell>
                                                <TableCell>
                                                    {c.parent ? (
                                                        <Chip label={c.parent.name} size="small" variant="outlined" />
                                                    ) : (
                                                        <Chip label="Primary" size="small" color="success" variant="outlined" />
                                                    )}
                                                </TableCell>
                                                {hasAnyPermission(['edit categories', 'delete categories']) && (
                                                    <TableCell align="right">
                                                        {hasPermission('edit categories') && (
                                                            <Tooltip title="Edit Category">
                                                                <IconButton size="small" onClick={() => handleOpenEditCategory(c)}><EditIcon fontSize="small" /></IconButton>
                                                            </Tooltip>
                                                        )}
                                                        {hasPermission('delete categories') && (
                                                            <Tooltip title="Delete Category">
                                                                <IconButton size="small" color="error" onClick={() => handleDeleteCategory(c.id)}><DeleteIcon fontSize="small" /></IconButton>
                                                            </Tooltip>
                                                        )}
                                                    </TableCell>
                                                )}
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </Box>
            </TabPanel>

            {/* GENERAL SETTINGS TAB */}
            <TabPanel value={activeTabLabel} index="General Settings">
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, maxWidth: 600 }}>
                    <Box>
                        <Typography variant="h6" fontWeight={800}>General System Configuration</Typography>
                        <Typography variant="body2" color="textSecondary">
                            Configure global parameters, currency formatting, and system-wide defaults.
                        </Typography>
                    </Box>

                    <Paper sx={{ p: 3, borderRadius: '16px', border: '1px solid', borderColor: 'divider' }}>
                        <Grid container spacing={3}>
                            <Grid item xs={12}>
                                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>
                                    Currency Settings
                                </Typography>
                                <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 2 }}>
                                    Adjust the currency symbol and ISO code displayed across all transaction grids, receipts, invoices, and financial summaries.
                                </Typography>
                            </Grid>

                            <Grid item xs={12} sm={6}>
                                <FormControl fullWidth>
                                    <InputLabel>Currency Symbol</InputLabel>
                                    <Select
                                        value={currencyInput}
                                        label="Currency Symbol"
                                        onChange={(e) => setCurrencyInput(e.target.value)}
                                    >
                                        <MenuItem value="Rs.">Rs. (Rupees)</MenuItem>
                                        <MenuItem value="$">$ (Dollars)</MenuItem>
                                        <MenuItem value="€">€ (Euros)</MenuItem>
                                        <MenuItem value="£">£ (Pounds)</MenuItem>
                                        <MenuItem value="₹">₹ (INR Rupees)</MenuItem>
                                        <MenuItem value="RM">RM (Ringgit)</MenuItem>
                                        <MenuItem value="AED">AED (Dirhams)</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>

                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Currency ISO Code"
                                    placeholder="e.g. LKR, USD, EUR"
                                    value={currencyCodeInput}
                                    onChange={(e) => setCurrencyCodeInput(e.target.value)}
                                />
                            </Grid>

                            <Grid item xs={12}>
                                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700, mt: 1 }}>
                                    API Configuration
                                </Typography>
                                <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 2 }}>
                                    Modify the backend API endpoint base URL. Changes are saved locally to this browser and synced to the database.
                                </Typography>
                                <TextField
                                    fullWidth
                                    label="Backend API URL"
                                    placeholder="https://mobike360.com/backend/api"
                                    value={apiUrlInput}
                                    onChange={(e) => setApiUrlInput(e.target.value)}
                                />
                            </Grid>

                            <Grid item xs={12}>
                                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700, mt: 1 }}>
                                    Dashboard Security
                                </Typography>
                                <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 2 }}>
                                    Select which roles are permitted to see revenue figures and performance charts on the main dashboard overview.
                                </Typography>
                                <FormControl fullWidth>
                                    <InputLabel>Revenue Visibility</InputLabel>
                                    <Select
                                        value={revenueVisibilityInput}
                                        label="Revenue Visibility"
                                        onChange={(e) => setRevenueVisibilityInput(e.target.value)}
                                    >
                                        <MenuItem value="everyone">Everyone (All Staff)</MenuItem>
                                        <MenuItem value="managers_admin">Admins & Managers Only</MenuItem>
                                        <MenuItem value="admin_only">Admins Only</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>

                            <Grid item xs={12}>
                                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700, mt: 1 }}>
                                    🔐 {t('settings.cancelAuthTitle') || 'Invoice Cancellation Authorization'}
                                </Typography>
                                <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 2 }}>
                                    {t('settings.cancelAuthDesc') || 'Set the supervisor authorization code required to cancel an invoice. Keep this secure and share only with authorized staff.'}
                                </Typography>
                                <TextField
                                    fullWidth
                                    type="password"
                                    label={t('settings.cancelAuthLabel') || 'Cancel Invoice Authorization Code'}
                                    placeholder={t('settings.cancelAuthPlaceholder') || 'Enter a secure code'}
                                    value={cancelAuthCodeInput}
                                    onChange={(e) => setCancelAuthCodeInput(e.target.value)}
                                    inputProps={{ autoComplete: 'new-password' }}
                                />
                            </Grid>

                            <Grid item xs={12} sm={6}>
                                <FormControl fullWidth size="small">
                                    <InputLabel id="default-print-format-label">Default Print Format</InputLabel>
                                    <Select
                                        labelId="default-print-format-label"
                                        label="Default Print Format"
                                        value={defaultPrintFormatInput}
                                        onChange={(e) => setDefaultPrintFormatInput(e.target.value)}
                                    >
                                        <MenuItem value="a4">📄 A4 Standard Sheet (Full Page Laser/PDF)</MenuItem>
                                        <MenuItem value="thermal">🧾 Thermal POS Receipt (80mm / 58mm Roll)</MenuItem>
                                        <MenuItem value="dotmatrix">📟 Dot Matrix (80-Column Impact Stationery)</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>

                            <Grid item xs={12}>
                                <Divider sx={{ my: 1 }} />
                                <Box display="flex" justifyContent="flex-end" sx={{ mt: 1 }}>
                                    <Button
                                        variant="contained"
                                        startIcon={<SaveIcon />}
                                        disabled={updatingSettings}
                                        onClick={async () => {
                                            setUpdatingSettings(true);
                                            try {
                                                await updateSettings({
                                                    currency_symbol: currencyInput,
                                                    currency_code: currencyCodeInput,
                                                    api_url: apiUrlInput,
                                                    revenue_visibility: revenueVisibilityInput,
                                                    cancel_auth_code: cancelAuthCodeInput,
                                                    default_print_format: defaultPrintFormatInput,
                                                });
                                                localStorage.setItem('api_url', apiUrlInput);
                                                api.defaults.baseURL = apiUrlInput;
                                                toast.success('System settings updated successfully!');
                                            } catch {
                                                toast.error('Failed to update system settings');
                                            } finally {
                                                setUpdatingSettings(false);
                                            }
                                        }}
                                        sx={{ borderRadius: '10px' }}
                                    >
                                        {updatingSettings ? 'Saving...' : 'Save Settings'}
                                    </Button>
                                </Box>
                            </Grid>
                        </Grid>
                    </Paper>
                    <MakesAndModelsSettings />
                    <ServicePurposeSettings />
                    <CustomServicesSettings />
                </Box>
            </TabPanel>

            {/* SMS SETTINGS TAB */}
            <TabPanel value={activeTabLabel} index="SMS Settings">
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <Box>
                        <Typography variant="h6" fontWeight={800}>SMS Gateway Configuration & Diagnostics</Typography>
                        <Typography variant="body2" color="textSecondary">
                            Configure your SMS gateway provider, verify connectivity with live API response diagnostics, and manage customer notification templates.
                        </Typography>
                    </Box>

                    {/* Gateway Credentials & Provider Settings */}
                    <Paper sx={{ p: 3, borderRadius: '16px', border: '1px solid', borderColor: 'divider' }}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2} mb={2.5}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                SMS Provider & Credentials
                            </Typography>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={smsEnabledInput}
                                        onChange={(e) => setSmsEnabledInput(e.target.checked)}
                                        color="primary"
                                    />
                                }
                                label={<Typography variant="body2" sx={{ fontWeight: 600 }}>Enable Automated Completion SMS</Typography>}
                            />
                        </Box>

                        <Grid container spacing={2.5}>
                            <Grid item xs={12} sm={6}>
                                <FormControl fullWidth size="small">
                                    <InputLabel id="sms-provider-label">SMS Provider</InputLabel>
                                    <Select
                                        labelId="sms-provider-label"
                                        label="SMS Provider"
                                        value={smsProviderInput}
                                        onChange={(e) => setSmsProviderInput(e.target.value)}
                                    >
                                        <MenuItem value="smslenz">SMSLenz / HTTP REST Gateway (Sri Lanka)</MenuItem>
                                        <MenuItem value="twilio">Twilio SMS API</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>

                            {smsProviderInput === 'smslenz' ? (
                                <>
                                    <Grid item xs={12} sm={6}>
                                        <TextField
                                            fullWidth
                                            label="Sender ID / Mask"
                                            placeholder="e.g. RATNAM_SS or DEMO"
                                            value={smsSenderIdInput}
                                            onChange={(e) => setSmsSenderIdInput(e.target.value)}
                                            size="small"
                                            helperText="Registered sender mask approved by your SMS provider"
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <TextField
                                            fullWidth
                                            label="SMS Gateway API URL"
                                            placeholder="https://smslenz.lk/api/v2/send"
                                            value={smsGatewayUrlInput}
                                            onChange={(e) => setSmsGatewayUrlInput(e.target.value)}
                                            size="small"
                                            helperText="Default: https://smslenz.lk/api/v2/send"
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <TextField
                                            fullWidth
                                            label="SMSLenz API Key / Token"
                                            type="password"
                                            placeholder="Enter your SMSLenz API Key"
                                            value={smsApiKeyInput}
                                            onChange={(e) => setSmsApiKeyInput(e.target.value)}
                                            size="small"
                                            helperText="Obtained from SMSLenz dashboard (Developers -> API Keys)"
                                        />
                                    </Grid>
                                </>
                            ) : (
                                <>
                                    <Grid item xs={12} sm={6}>
                                        <TextField
                                            fullWidth
                                            label="Twilio Phone Number / From"
                                            placeholder="+1234567890"
                                            value={twilioFromInput}
                                            onChange={(e) => setTwilioFromInput(e.target.value)}
                                            size="small"
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <TextField
                                            fullWidth
                                            label="Twilio Account SID"
                                            value={twilioSidInput}
                                            onChange={(e) => setTwilioSidInput(e.target.value)}
                                            size="small"
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <TextField
                                            fullWidth
                                            label="Twilio Auth Token"
                                            type="password"
                                            value={twilioTokenInput}
                                            onChange={(e) => setTwilioTokenInput(e.target.value)}
                                            size="small"
                                        />
                                    </Grid>
                                </>
                            )}

                            <Grid item xs={12} display="flex" justifyContent="flex-end">
                                <Button
                                    variant="contained"
                                    color="primary"
                                    startIcon={<SaveIcon />}
                                    onClick={handleSaveSmsGateway}
                                    disabled={updatingSettings}
                                    sx={{ borderRadius: '8px' }}
                                >
                                    {updatingSettings ? 'Saving Settings...' : 'Save SMS Configuration'}
                                </Button>
                            </Grid>
                        </Grid>
                    </Paper>

                    {/* LIVE SMS GATEWAY TEST & API RESPONSE INSPECTOR */}
                    <Paper sx={{ p: 3, borderRadius: '16px', border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
                        <Box display="flex" alignItems="center" gap={1} mb={1}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                                🧪 Live SMS Gateway Diagnostics & Test
                            </Typography>
                        </Box>
                        <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 2.5 }}>
                            Send a real-time test SMS to verify gateway connection, credentials, and inspect the raw response returned by the SMS API.
                        </Typography>

                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={4}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    label="Test Recipient Phone"
                                    placeholder="e.g. 0771234567 or +94771234567"
                                    value={testPhoneInput}
                                    onChange={(e) => setTestPhoneInput(e.target.value)}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    label="Test Message"
                                    value={testMessageInput}
                                    onChange={(e) => setTestMessageInput(e.target.value)}
                                />
                            </Grid>
                            <Grid item xs={12} sm={2} display="flex" alignItems="center">
                                <Button
                                    fullWidth
                                    variant="outlined"
                                    color="primary"
                                    startIcon={testLoading ? <CircularProgress size={18} /> : <SendIcon />}
                                    disabled={testLoading}
                                    onClick={handleSendTestSms}
                                    sx={{ height: 40, borderRadius: '8px', fontWeight: 700 }}
                                >
                                    {testLoading ? 'Testing...' : 'Send Test'}
                                </Button>
                            </Grid>
                        </Grid>

                        {/* Real-time Test Result & API Response */}
                        {testResult && (
                            <Box sx={{ mt: 2.5, p: 2, borderRadius: '12px', bgcolor: testResult.success ? 'success.lighter' : 'error.lighter', border: '1px solid', borderColor: testResult.success ? 'success.light' : 'error.light' }}>
                                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                                    <Box display="flex" alignItems="center" gap={1}>
                                        <Chip
                                            label={testResult.success ? 'SMS SENT (SUCCESS)' : 'GATEWAY ERROR (FAILED)'}
                                            color={testResult.success ? 'success' : 'error'}
                                            size="small"
                                            sx={{ fontWeight: 800, fontSize: '0.7rem' }}
                                        />
                                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                            {testResult.message}
                                        </Typography>
                                    </Box>
                                    {testResult.provider_message_id && (
                                        <Chip
                                            label={`Message ID: ${testResult.provider_message_id}`}
                                            size="small"
                                            variant="outlined"
                                            sx={{ fontSize: '0.65rem' }}
                                        />
                                    )}
                                </Box>

                                {testResult.error && (
                                    <Typography variant="caption" color="error" sx={{ fontWeight: 600, display: 'block', mb: 1 }}>
                                        Error Detail: {testResult.error}
                                    </Typography>
                                )}

                                <Box sx={{ mt: 1 }}>
                                    <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 0.5 }}>
                                        Raw API Response Payload:
                                    </Typography>
                                    <Box
                                        component="pre"
                                        sx={{
                                            m: 0,
                                            p: 1.5,
                                            borderRadius: '8px',
                                            bgcolor: '#0f172a',
                                            color: testResult.success ? '#38bdf8' : '#f87171',
                                            fontSize: '0.75rem',
                                            fontFamily: 'monospace',
                                            overflowX: 'auto',
                                            maxHeight: 220,
                                            whiteSpace: 'pre-wrap',
                                            wordBreak: 'break-all'
                                        }}
                                    >
                                        {typeof testResult.api_response === 'object'
                                            ? JSON.stringify(testResult.api_response, null, 2)
                                            : String(testResult.api_response || testResult.error || 'No raw response returned')}
                                    </Box>
                                </Box>
                            </Box>
                        )}
                    </Paper>

                    {/* Templates List */}
                    <Paper sx={{ p: 3, borderRadius: '16px', border: '1px solid', borderColor: 'divider' }}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                            <Box>
                                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                    Message Templates
                                </Typography>
                                <Typography variant="caption" color="textSecondary">
                                    Placeholders: <code>{"{CustomerName}"}</code>, <code>{"{JobNumber}"}</code>, <code>{"{EstAmount}"}</code>, <code>{"{PaidAmount}"}</code>
                                </Typography>
                            </Box>
                            <Button
                                variant="outlined"
                                color="primary"
                                startIcon={<AddIcon />}
                                size="small"
                                onClick={() => handleOpenTemplateDialog(null)}
                            >
                                Add Template
                            </Button>
                        </Box>
                        
                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>Template Body</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 700 }}>Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {smsTemplatesList.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={3} align="center" sx={{ py: 2 }}>
                                                No templates configured yet.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        smsTemplatesList.map((tpl, idx) => (
                                            <TableRow key={tpl.id || idx}>
                                                <TableCell sx={{ fontWeight: 600 }}>{tpl.name}</TableCell>
                                                <TableCell>{tpl.template}</TableCell>
                                                <TableCell align="right">
                                                    <IconButton size="small" onClick={() => handleOpenTemplateDialog(tpl)}>
                                                        <EditIcon fontSize="small" />
                                                    </IconButton>
                                                    <IconButton size="small" color="error" onClick={() => handleDeleteTemplate(tpl)}>
                                                        <DeleteIcon fontSize="small" />
                                                    </IconButton>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </Box>
            </TabPanel>

            {/* DIALOG: CREATE / EDIT SMS TEMPLATE */}
            <Dialog open={smsTemplateDialogOpen} onClose={() => setSmsTemplateDialogOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ fontWeight: 800 }}>
                    {editingSmsTemplate ? 'Edit SMS Template' : 'Add SMS Template'}
                </DialogTitle>
                <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <TextField
                        fullWidth
                        label="Template Name"
                        value={newTemplateName}
                        onChange={(e) => setNewTemplateName(e.target.value)}
                        placeholder="e.g. Job Completed Alert"
                        size="small"
                    />
                    <TextField
                        fullWidth
                        multiline
                        rows={4}
                        label="Message Text"
                        value={newTemplateText}
                        onChange={(e) => setNewTemplateText(e.target.value)}
                        placeholder="Use {CustomerName}, {JobNumber}, {EstAmount}, {PaidAmount} as placeholders"
                        size="small"
                        helperText="Message text limit: 160 characters per unit"
                    />
                </DialogContent>
                <DialogActions sx={{ p: 2.5 }}>
                    <Button onClick={() => setSmsTemplateDialogOpen(false)} color="inherit">Cancel</Button>
                    <Button onClick={handleSaveTemplate} variant="contained" color="primary" disabled={updatingSettings}>
                        Save Template
                    </Button>
                </DialogActions>
            </Dialog>

            {/* DIALOG: CREATE / EDIT BRANCH */}
            <Dialog open={branchDialogOpen} onClose={() => setBranchDialogOpen(false)} maxWidth="sm" fullWidth scroll="paper">
                <DialogTitle>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{
                            width: 38, height: 38, borderRadius: '10px',
                            background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0,
                        }}>
                            <BusinessIcon sx={{ color: '#fff', fontSize: 18 }} />
                        </Box>
                        <Box>
                            <Typography variant="subtitle1" fontWeight={800} sx={{ lineHeight: 1.2 }}>
                                {editingBranch ? 'Edit Branch' : 'New Branch Outlet'}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                                {editingBranch ? `Updating ${editingBranch.name}` : 'Register a new workshop location'}
                            </Typography>
                        </Box>
                    </Box>
                </DialogTitle>
                <form onSubmit={handleBranchSubmit(handleSaveBranch)} style={{ display: 'flex', flexDirection: 'column', maxHeight: 'inherit', overflow: 'hidden' }}>
                    <DialogContent dividers>
                        <Grid container spacing={2.5}>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="Branch Name"
                                    placeholder="e.g. Main Workshop — Colombo"
                                    {...registerBranch('name', { required: 'Name is required' })}
                                    error={!!branchErrors.name}
                                    helperText={branchErrors.name?.message}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Phone Number"
                                    placeholder="+94 xx xxx xxxx"
                                    {...registerBranch('phone', { required: 'Phone is required' })}
                                    error={!!branchErrors.phone}
                                    helperText={branchErrors.phone?.message}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Email Address"
                                    type="email"
                                    placeholder="branch@workshop.com"
                                    {...registerBranch('email')}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Tax / VAT ID"
                                    placeholder="TAX-XXXXXXX"
                                    {...registerBranch('tax_id')}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    multiline
                                    rows={2}
                                    label="Branch Address"
                                    placeholder="Street, City, Postal Code"
                                    {...registerBranch('address', { required: 'Address is required' })}
                                    error={!!branchErrors.address}
                                    helperText={branchErrors.address?.message}
                                />
                            </Grid>
                        </Grid>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setBranchDialogOpen(false)} color="inherit" sx={{ borderRadius: '10px' }}>Cancel</Button>
                        <Button type="submit" variant="contained" color="primary" startIcon={<SaveIcon />} sx={{ borderRadius: '10px', minWidth: 130 }}>
                            {editingBranch ? 'Update Branch' : 'Create Branch'}
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>

            {/* DIALOG: CREATE / EDIT CATEGORY */}
            <Dialog open={categoryDialogOpen} onClose={() => setCategoryDialogOpen(false)} maxWidth="sm" fullWidth scroll="paper">
                <DialogTitle>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{
                            width: 38, height: 38, borderRadius: '10px',
                            background: 'linear-gradient(135deg, #10b981, #047857)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0,
                        }}>
                            <CategoryIcon sx={{ color: '#fff', fontSize: 18 }} />
                        </Box>
                        <Box>
                            <Typography variant="subtitle1" fontWeight={800} sx={{ lineHeight: 1.2 }}>
                                {editingCategory ? 'Edit Category' : 'New Category'}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                                {editingCategory ? `Editing — ${editingCategory.name}` : 'Create a new inventory classification'}
                            </Typography>
                        </Box>
                    </Box>
                </DialogTitle>
                <form onSubmit={handleCategorySubmit(handleSaveCategory)} style={{ display: 'flex', flexDirection: 'column', maxHeight: 'inherit', overflow: 'hidden' }}>
                    <DialogContent dividers>
                        <Grid container spacing={2.5}>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="Category Name"
                                    placeholder="e.g. Engine Parts, Filters, Lubricants"
                                    {...registerCategory('name', { required: 'Name is required' })}
                                    error={!!categoryErrors.name}
                                    helperText={categoryErrors.name?.message}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    multiline
                                    rows={2}
                                    label="Description (optional)"
                                    placeholder="Brief description of what items belong here..."
                                    {...registerCategory('description')}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Controller
                                    name="parent_id"
                                    control={categoryControl}
                                    render={({ field }) => (
                                        <FormControl fullWidth>
                                            <InputLabel>Parent Category</InputLabel>
                                            <Select {...field} label="Parent Category">
                                                <MenuItem value=""><em>None (Primary)</em></MenuItem>
                                                {categories
                                                    .filter(cat => cat.id !== editingCategory?.id)
                                                    .map((cat) => (
                                                        <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>
                                                    ))}
                                            </Select>
                                        </FormControl>
                                    )}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Controller
                                    name="branch_id"
                                    control={categoryControl}
                                    rules={{ required: 'Branch is required' }}
                                    render={({ field }) => (
                                        <FormControl fullWidth error={!!categoryErrors.branch_id}>
                                            <InputLabel>Branch</InputLabel>
                                            <Select {...field} label="Branch">
                                                {branches.map((b) => (
                                                    <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                    )}
                                />
                            </Grid>
                        </Grid>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setCategoryDialogOpen(false)} color="inherit" sx={{ borderRadius: '10px' }}>Cancel</Button>
                        <Button type="submit" variant="contained" color="secondary" startIcon={<SaveIcon />} sx={{ borderRadius: '10px', minWidth: 140 }}>
                            {editingCategory ? 'Update Category' : 'Create Category'}
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>

            {/* DIALOG: CREATE / EDIT ROLE */}
            <Dialog open={roleDialogOpen} onClose={() => setRoleDialogOpen(false)} maxWidth="sm" fullWidth scroll="paper">
                <DialogTitle>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{
                            width: 38, height: 38, borderRadius: '10px',
                            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0,
                        }}>
                            <KeyIcon sx={{ color: '#fff', fontSize: 18 }} />
                        </Box>
                        <Box>
                            <Typography variant="subtitle1" fontWeight={800} sx={{ lineHeight: 1.2 }}>
                                {editingRole ? `Edit Role — ${editingRole.name.toUpperCase()}` : 'Create New Role'}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                                {editingRole ? 'Adjust the permission bundle for this role' : 'Define a new role with specific permissions'}
                            </Typography>
                        </Box>
                    </Box>
                </DialogTitle>
                <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                    <TextField
                        fullWidth
                        label="Role Name"
                        placeholder="e.g. supervisor, inspector"
                        value={roleNameInput}
                        onChange={(e) => setRoleNameInput(e.target.value)}
                        disabled={!!editingRole}
                        helperText={editingRole ? 'Role name is locked after creation' : 'Use lowercase, no spaces'}
                    />
                    <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="body2" fontWeight={700}>Permission Matrix</Typography>
                            <Chip
                                label={`${rolePermissionsInput.length} / ${allPermissions.length} selected`}
                                size="small"
                                color={rolePermissionsInput.length > 0 ? 'primary' : 'default'}
                                variant="outlined"
                            />
                        </Box>
                        <Box sx={{
                            maxHeight: 300,
                            overflowY: 'auto',
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: '12px',
                            p: 0.5,
                        }}>
                            <List dense disablePadding>
                                {allPermissions.map((perm) => {
                                    const checked = rolePermissionsInput.includes(perm.name);
                                    return (
                                        <ListItem
                                            key={perm.id ?? perm.name}
                                            dense
                                            disableGutters
                                            onClick={() => handleRolePermissionToggle(perm.name)}
                                            sx={{
                                                cursor: 'pointer',
                                                px: 1.5, py: 0.6,
                                                borderRadius: '8px',
                                                mb: 0.2,
                                                bgcolor: checked ? 'action.selected' : 'transparent',
                                                '&:hover': { bgcolor: 'action.hover' },
                                                transition: 'background-color 0.15s',
                                            }}
                                        >
                                            <ListItemIcon sx={{ minWidth: 34 }}>
                                                <Checkbox
                                                    edge="start"
                                                    checked={checked}
                                                    tabIndex={-1}
                                                    disableRipple
                                                    size="small"
                                                    color="primary"
                                                />
                                            </ListItemIcon>
                                            <ListItemText
                                                primary={perm.name}
                                                primaryTypographyProps={{
                                                    fontSize: '0.83rem',
                                                    fontWeight: checked ? 700 : 500,
                                                }}
                                            />
                                            {checked && (
                                                <CheckCircleIcon sx={{ fontSize: 14, color: 'primary.main', opacity: 0.8 }} />
                                            )}
                                        </ListItem>
                                    );
                                })}
                            </List>
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setRoleDialogOpen(false)} color="inherit" sx={{ borderRadius: '10px' }}>Cancel</Button>
                    <Button onClick={handleSaveRole} variant="contained" startIcon={<SaveIcon />} sx={{ borderRadius: '10px', minWidth: 130 }}>
                        {editingRole ? 'Save Changes' : 'Create Role'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* DIALOG: CREATE / EDIT USER */}
            <Dialog open={userDialogOpen} onClose={() => setUserDialogOpen(false)} maxWidth="md" fullWidth scroll="paper">
                <DialogTitle>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{
                            width: 38, height: 38, borderRadius: '10px',
                            background: 'linear-gradient(135deg, #0ea5e9, #0369a1)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0,
                        }}>
                            <PersonIcon sx={{ color: '#fff', fontSize: 18 }} />
                        </Box>
                        <Box>
                            <Typography variant="subtitle1" fontWeight={800} sx={{ lineHeight: 1.2 }}>
                                {editingUser ? 'Edit Employee' : 'Add New Employee'}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                                {editingUser ? `Updating record for ${editingUser.name}` : 'Create a staff account and assign a role'}
                            </Typography>
                        </Box>
                    </Box>
                </DialogTitle>
                <form onSubmit={handleUserSubmit(handleSaveUser)} autoComplete="off" style={{ display: 'flex', flexDirection: 'column', maxHeight: 'inherit', overflow: 'hidden' }}>
                    <input type="text" name="dummy_username" style={{ display: 'none' }} autoComplete="username" />
                    <input type="password" name="dummy_password" style={{ display: 'none' }} autoComplete="new-password" />
                    <DialogContent dividers>
                        {/* Section: Profile Photo */}
                        <Typography variant="overline" sx={{ fontWeight: 700, color: 'text.secondary', letterSpacing: '0.08em', display: 'block', mb: 1.5 }}>
                            Employee Photo
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 3 }}>
                            <Avatar
                                src={imagePreviewUrl || undefined}
                                sx={{ width: 80, height: 80, bgcolor: 'primary.main', fontSize: '2rem', fontWeight: 600 }}
                            >
                                {editingUser ? (editingUser.name || 'E').charAt(0).toUpperCase() : 'N'}
                            </Avatar>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                <Box display="flex" gap={1.5}>
                                    <Button variant="outlined" component="label" size="small" sx={{ borderRadius: '8px' }}>
                                        Upload Photo
                                        <input
                                            type="file"
                                            hidden
                                            accept="image/*"
                                            onChange={(e) => {
                                                const file = e.target.files[0];
                                                if (file) {
                                                    setSelectedImageFile(file);
                                                    setImagePreviewUrl(URL.createObjectURL(file));
                                                    setRemovePhotoFlag(false);
                                                }
                                            }}
                                        />
                                    </Button>
                                    {(imagePreviewUrl || selectedImageFile) && (
                                        <Button
                                            variant="outlined"
                                            color="error"
                                            size="small"
                                            sx={{ borderRadius: '8px' }}
                                            onClick={() => {
                                                setSelectedImageFile(null);
                                                setImagePreviewUrl(null);
                                                setRemovePhotoFlag(true);
                                            }}
                                        >
                                            Remove Photo
                                        </Button>
                                    )}
                                </Box>
                                <Typography variant="caption" display="block" color="textSecondary" sx={{ mt: 0.5 }}>
                                    Recommended: JPG or PNG, max 2MB
                                </Typography>
                            </Box>
                        </Box>

                        {/* Section: Personal Info */}
                        <Typography variant="overline" sx={{ fontWeight: 700, color: 'text.secondary', letterSpacing: '0.08em', display: 'block', mb: 1.5 }}>
                            Personal Information
                        </Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                                <TextField 
                                    fullWidth 
                                    label="First Name" 
                                    placeholder="John"
                                    inputProps={{ style: { textTransform: 'uppercase' } }}
                                    {...registerUser('first_name', { required: 'First name is required' })}
                                    error={!!userErrors.first_name} 
                                    helperText={userErrors.first_name?.message}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField 
                                    fullWidth 
                                    label="Last Name" 
                                    placeholder="Doe"
                                    inputProps={{ style: { textTransform: 'uppercase' } }}
                                    {...registerUser('last_name', { required: 'Last name is required' })}
                                    error={!!userErrors.last_name} 
                                    helperText={userErrors.last_name?.message}
                                />
                            </Grid>
                            {/* Auto-generated Login ID */}
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="Login ID (Max 8 chars)"
                                    placeholder={generatedUsername || 'Auto-generated if left blank'}
                                    inputProps={{ maxLength: 8, style: { textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em' }, autoComplete: 'new-password' }}
                                    {...registerUser('username', { 
                                        maxLength: { value: 8, message: 'Max 8 characters' }
                                    })}
                                    error={!!userErrors.username}
                                    helperText={userErrors.username?.message || 'This user will login with this ID or their email.'}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <KeyIcon color="primary" />
                                            </InputAdornment>
                                        ),
                                    }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField 
                                    fullWidth 
                                    label="Email Address (Optional)" 
                                    type="email" 
                                    placeholder="staff@workshop.com"
                                    {...registerUser('email')}
                                    error={!!userErrors.email} 
                                    helperText={userErrors.email?.message}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Controller
                                    name="phone"
                                    control={userControl}
                                    rules={{ required: 'Phone is required' }}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            fullWidth
                                            label="Phone Number"
                                            placeholder="+94 7X XXX XXXX"
                                            error={!!userErrors.phone}
                                            helperText={userErrors.phone?.message}
                                            onBlur={(e) => {
                                                field.onBlur();
                                                field.onChange(formatSriLankanPhone(e.target.value));
                                            }}
                                        />
                                    )}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField 
                                    fullWidth 
                                    label="Identity Card No" 
                                    placeholder="NIC Number"
                                    inputProps={{ style: { textTransform: 'uppercase' } }}
                                    {...registerUser('identity_card_no', { required: 'Identity card number is required' })}
                                    error={!!userErrors.identity_card_no} 
                                    helperText={userErrors.identity_card_no?.message}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField fullWidth label="Date of Birth" type="date" InputLabelProps={{ shrink: true }}
                                    {...registerUser('dob')}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField 
                                    fullWidth 
                                    label="Employee ID" 
                                    placeholder="EMP-001"
                                    inputProps={{ style: { textTransform: 'uppercase' } }}
                                    {...registerUser('employee_id')}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField fullWidth multiline rows={1} label="Address" placeholder="Residential address..."
                                    {...registerUser('address')}
                                />
                            </Grid>
                        </Grid>

                        {/* Section: Bank Details */}
                        <Typography variant="overline" sx={{ fontWeight: 700, color: 'text.secondary', letterSpacing: '0.08em', display: 'block', mt: 3, mb: 1.5 }}>
                            Bank Details
                        </Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={4}>
                                <TextField 
                                    fullWidth 
                                    label="Bank Name" 
                                    placeholder="Commercial Bank"
                                    inputProps={{ style: { textTransform: 'uppercase' } }}
                                    {...registerUser('bank_name', { required: 'Bank name is required' })}
                                    error={!!userErrors.bank_name} 
                                    helperText={userErrors.bank_name?.message}
                                />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <TextField 
                                    fullWidth 
                                    label="Bank Branch" 
                                    placeholder="Colombo"
                                    inputProps={{ style: { textTransform: 'uppercase' } }}
                                    {...registerUser('bank_branch', { required: 'Bank branch is required' })}
                                    error={!!userErrors.bank_branch} 
                                    helperText={userErrors.bank_branch?.message}
                                />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <TextField fullWidth label="Account Number" placeholder="1000234567"
                                    {...registerUser('bank_account_no', { required: 'Account number is required' })}
                                    error={!!userErrors.bank_account_no} helperText={userErrors.bank_account_no?.message}
                                />
                            </Grid>
                        </Grid>

                        {/* Section: Employment */}
                        <Typography variant="overline" sx={{ fontWeight: 700, color: 'text.secondary', letterSpacing: '0.08em', display: 'block', mt: 3, mb: 1.5 }}>
                            Employment Details
                        </Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                                <Controller name="branch_id" control={userControl} rules={{ required: 'Branch is required' }}
                                    render={({ field }) => (
                                        <FormControl fullWidth error={!!userErrors.branch_id}>
                                            <InputLabel>Branch</InputLabel>
                                            <Select {...field} label="Branch">
                                                {branches.map((b) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
                                            </Select>
                                        </FormControl>
                                    )}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Controller name="role" control={userControl} rules={{ required: 'Role is required' }}
                                    render={({ field }) => (
                                        <FormControl fullWidth error={!!userErrors.role}>
                                            <InputLabel>Role</InputLabel>
                                            <Select {...field} label="Role">
                                                {roles.map((r) => <MenuItem key={r.id} value={r.name}>{r.name.toUpperCase()}</MenuItem>)}
                                            </Select>
                                        </FormControl>
                                    )}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField fullWidth label="Joining Date" type="date" InputLabelProps={{ shrink: true }}
                                    {...registerUser('joining_date')}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField fullWidth label="Leave Days Per Year" type="number" placeholder="21"
                                    {...registerUser('leave_days_per_year', { required: 'Leave days per year is required' })}
                                    error={!!userErrors.leave_days_per_year} helperText={userErrors.leave_days_per_year?.message}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Controller name="salary_rate_type" control={userControl} rules={{ required: 'Salary rate type is required' }}
                                    render={({ field }) => (
                                        <FormControl fullWidth error={!!userErrors.salary_rate_type}>
                                            <InputLabel>Salary Rate Type</InputLabel>
                                            <Select {...field} label="Salary Rate Type">
                                                <MenuItem value="monthly">Monthly Rate</MenuItem>
                                                <MenuItem value="daily">Daily Rate</MenuItem>
                                            </Select>
                                        </FormControl>
                                    )}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField fullWidth label="Salary / Rate" type="number" placeholder="0.00"
                                    {...registerUser('salary')}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Controller name="epf_etf" control={userControl}
                                    render={({ field }) => (
                                        <FormControlLabel
                                            control={<Switch checked={!!field.value} onChange={(e) => field.onChange(e.target.checked)} color="primary" />}
                                            label={<Typography variant="body2" fontWeight={600}>EPF / ETF Contribution (Yes/No)</Typography>}
                                        />
                                    )}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Controller name="is_active" control={userControl}
                                    render={({ field }) => (
                                        <FormControlLabel
                                            control={<Switch checked={!!field.value} onChange={(e) => field.onChange(e.target.checked)} color="primary" />}
                                            label={<Typography variant="body2" fontWeight={600}>Account Active</Typography>}
                                        />
                                    )}
                                />
                            </Grid>
                        </Grid>

                        {/* Section: Password */}
                        <Typography variant="overline" sx={{ fontWeight: 700, color: 'text.secondary', letterSpacing: '0.08em', display: 'block', mt: 3, mb: 1.5 }}>
                            {editingUser ? 'Change Password (Leave blank to keep current)' : 'Set Password'}
                        </Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                                <TextField fullWidth type="password"
                                    label={editingUser ? 'New Password' : 'Password'}
                                    {...registerUser('password')}
                                    inputProps={{ autoComplete: 'new-password' }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField fullWidth type="password"
                                    label={editingUser ? 'Confirm New Password' : 'Confirm Password'}
                                    {...registerUser('password_confirmation')}
                                    inputProps={{ autoComplete: 'new-password' }}
                                />
                            </Grid>
                        </Grid>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setUserDialogOpen(false)} color="inherit" sx={{ borderRadius: '10px' }}>Cancel</Button>
                        <Button type="submit" variant="contained" startIcon={<SaveIcon />} sx={{ borderRadius: '10px', minWidth: 130 }}>
                            {editingUser ? 'Update Employee' : 'Create Account'}
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>

            {/* DIALOG: DIRECT USER PERMISSIONS OVERRIDES */}
            <Dialog open={permissionsDialogOpen} onClose={() => setPermissionsDialogOpen(false)} maxWidth="sm" fullWidth scroll="paper">
                <DialogTitle>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{
                            width: 38, height: 38, borderRadius: '10px',
                            background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0,
                        }}>
                            <LockIcon sx={{ color: '#fff', fontSize: 18 }} />
                        </Box>
                        <Box>
                            <Typography variant="subtitle1" fontWeight={800} sx={{ lineHeight: 1.2 }}>
                                Custom Permissions
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                                {selectedUserForPermissions?.name} — overrides role defaults
                            </Typography>
                        </Box>
                    </Box>
                </DialogTitle>
                <DialogContent dividers>
                    <Alert severity="info" sx={{ mb: 2, borderRadius: '10px', fontSize: '0.8rem' }}>
                        These permissions are granted <strong>directly</strong> to this user, in addition to what their role already provides.
                    </Alert>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                        <Typography variant="body2" fontWeight={700}>Available Permissions</Typography>
                        <Chip
                            label={`${userDirectPermissions.length} granted`}
                            size="small"
                            color={userDirectPermissions.length > 0 ? 'error' : 'default'}
                            variant="outlined"
                        />
                    </Box>
                    <Box sx={{
                        maxHeight: 340,
                        overflowY: 'auto',
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: '12px',
                        p: 0.5,
                    }}>
                        <List dense disablePadding>
                            {allPermissions.map((permission) => {
                                const isAssigned = userDirectPermissions.includes(permission.name);
                                return (
                                    <ListItem
                                        key={permission.id}
                                        dense
                                        disableGutters
                                        onClick={() => handlePermissionToggle(permission.name)}
                                        sx={{
                                            cursor: 'pointer',
                                            px: 1.5, py: 0.6,
                                            borderRadius: '8px',
                                            mb: 0.2,
                                            bgcolor: isAssigned ? 'action.selected' : 'transparent',
                                            '&:hover': { bgcolor: 'action.hover' },
                                            transition: 'background-color 0.15s',
                                        }}
                                    >
                                        <ListItemIcon sx={{ minWidth: 34 }}>
                                            <Checkbox
                                                edge="start"
                                                checked={isAssigned}
                                                tabIndex={-1}
                                                disableRipple
                                                size="small"
                                                color="error"
                                            />
                                        </ListItemIcon>
                                        <ListItemText
                                            primary={permission.name}
                                            primaryTypographyProps={{
                                                fontSize: '0.83rem',
                                                fontWeight: isAssigned ? 700 : 500,
                                            }}
                                        />
                                        {isAssigned && (
                                            <CheckCircleIcon sx={{ fontSize: 14, color: 'error.main', opacity: 0.8 }} />
                                        )}
                                    </ListItem>
                                );
                            })}
                        </List>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPermissionsDialogOpen(false)} color="inherit" sx={{ borderRadius: '10px' }}>Cancel</Button>
                    <Button onClick={handleSaveUserPermissions} variant="contained" color="error" startIcon={<SaveIcon />} sx={{ borderRadius: '10px', minWidth: 140 }}>
                        Save Permissions
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default Settings;
